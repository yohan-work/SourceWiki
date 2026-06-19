# 현재 CI 및 컨테이너 구조

> 확인 기준: 2026-06-19, `main` 브랜치 `1df6ea5`

## 1. 전체 구조 요약

현재 저장소는 pnpm workspace 기반 모노레포이며, 실행 단위는 Web, API, PostgreSQL이다. 전체 Docker 환경에서는 Caddy가 외부 요청을 받는 단일 진입점 역할을 추가로 담당한다.

```text
사용자 또는 CI
      |
      | http://localhost:${APP_PORT:-8080}
      v
    Caddy
      |-- /api/*  --> API (Express, port 4000) --> PostgreSQL (port 5432)
      `-- 그 외   --> Web (Next.js, port 3000)
```

| 구성 요소 | 구현 | 역할 |
| --- | --- | --- |
| `apps/web` | Next.js 16, React 19 | 웹 UI와 상태 화면 |
| `apps/api` | Express 5, Prisma 7 | API, health endpoint, DB 연결 |
| `packages/shared` | TypeScript, Zod | Web/API 공용 schema와 타입 |
| `db` | PostgreSQL 17 Alpine | 애플리케이션 데이터베이스 |
| `caddy` | Caddy 2.10 Alpine | Web/API same-origin reverse proxy |

현재 Prisma schema에는 업무 모델이나 migration이 없고, DB는 readiness 확인을 위한 실제 `SELECT 1` 연결에 사용된다.

## 2. GitHub Actions

워크플로는 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) 한 개이며 이름은 `CI`다.

### 실행 조건

- 모든 Pull Request에서 실행
- `main` 브랜치에 push할 때 실행
- 동일한 Git ref에서 새 실행이 시작되면 이전 실행을 취소
- 수동 실행(`workflow_dispatch`)은 현재 지원하지 않음

### `quality` job

Ubuntu 최신 runner에서 최대 15분 동안 실행한다.

1. PostgreSQL `17-alpine` service container 실행
2. repository checkout
3. pnpm `10.34.0`, Node.js `24.16.0` 설정
4. pnpm store cache 사용
5. `pnpm install --frozen-lockfile`
6. `pnpm lint`
7. `pnpm typecheck`
8. `pnpm test`
9. `pnpm build`
10. `pnpm format:check`

테스트 환경에는 다음 값이 고정된다.

```text
NODE_ENV=test
DATABASE_URL=postgresql://sourcewiki:sourcewiki_local@localhost:5432/sourcewiki?schema=public
```

즉 lint, 타입 검사, 테스트, 전체 빌드, 포맷 검사를 하나의 품질 게이트로 묶고 있다. 한 단계가 실패하면 이후 단계는 실행되지 않는다.

### `compose-smoke` job

Ubuntu 최신 runner에서 최대 20분 동안 실제 컨테이너 스택을 검증한다.

1. `docker compose config --quiet`로 Compose 문법과 변수 치환 확인
2. `docker compose up --build --wait --wait-timeout 180`으로 전체 이미지 빌드 및 실행
3. `http://localhost:8080/` 응답 확인
4. `http://localhost:8080/api/health/live` 응답 확인
5. `http://localhost:8080/api/health/ready` 응답 확인
6. 실패한 경우 전체 서비스 로그 출력
7. 성공 여부와 관계없이 `docker compose down --volumes`로 컨테이너와 CI용 volume 제거

`quality`와 `compose-smoke` 사이에는 `needs` 의존성이 없으므로 서로 독립적으로 병렬 실행될 수 있다.

### 현재 Actions에 없는 기능

- Docker Hub, GHCR 등의 container registry 로그인 및 이미지 push
- image tag 또는 release 생성
- 운영/스테이징 서버 배포
- cloud provider 연동
- database migration 실행
- GitHub Environment와 repository secret을 이용한 배포 승인
- dependency/security scan 및 SBOM 생성
- 테스트 coverage 업로드

따라서 현재 GitHub Actions는 **검증 전용 CI**이며 CD는 구현되어 있지 않다.

## 3. Docker Compose에 실행되는 것

[`compose.yaml`](../compose.yaml)은 다음 4개 서비스를 실행한다.

### `db`

- 외부 이미지: `postgres:17-alpine`
- 기본 host port: `5432`
- 데이터 경로 `/var/lib/postgresql/data`를 `postgres_data` named volume에 저장
- `pg_isready` health check 사용
- 컨테이너 재시작 정책: `unless-stopped`

### `api`

- `apps/api/Dockerfile`을 repository root context에서 로컬 빌드
- 내부 port: `4000`
- DB가 healthy가 된 뒤 시작
- `DATABASE_URL`의 host는 Compose service 이름인 `db`
- `/api/health/ready`를 자체 health check로 사용
- host port에 직접 publish하지 않으며 Caddy를 통해 접근

### `web`

- `apps/web/Dockerfile`을 repository root context에서 로컬 빌드
- 내부 port: `3000`
- API가 healthy가 된 뒤 시작
- `/` 응답을 자체 health check로 사용
- host port에 직접 publish하지 않으며 Caddy를 통해 접근

### `caddy`

- 외부 이미지: `caddy:2.10-alpine`
- 기본 host port `8080`을 container port `80`에 연결
- `/api/*`는 `api:4000`, 나머지는 `web:3000`으로 전달
- API와 Web이 모두 healthy가 된 뒤 시작
- `caddy_data`, `caddy_config` named volume 사용

서비스 시작 의존 관계는 다음과 같다.

```text
db healthy -> api healthy -> web healthy -> caddy start
                     `----------------------^
```

Caddy는 API와 Web 둘 다 healthy여야 시작한다. Web도 API health에 의존하므로 API 또는 DB 장애 시 전체 외부 진입점이 준비되지 않는다.

## 4. Web Docker 이미지에 포함되는 것

Web 이미지는 `node:24.16-alpine`을 기반으로 다음 항목을 포함한다.

- pnpm `10.34.0`
- root workspace 설정과 lockfile
- 전체 workspace production/dev dependency가 설치된 `/app/node_modules`
- `apps/web` 소스와 Next.js 빌드 결과인 `.next`
- `packages/shared` 소스와 `dist` 빌드 결과
- 실행에 직접 필요하지 않은 API package manifest
- 빌드 도구와 dev dependency

컨테이너 시작 명령은 다음과 같다.

```text
pnpm --filter @sourcewiki/web start --hostname 0.0.0.0
```

현재 Dockerfile은 stage 이름만 `build`로 지정된 단일 스테이지다. 별도 runtime stage나 Next.js `output: 'standalone'` 구성이 없으므로 빌드 도구, dev dependency, 소스가 최종 이미지에도 남는다.

## 5. API Docker 이미지에 포함되는 것

API 이미지도 `node:24.16-alpine` 기반 단일 스테이지이며 다음 항목을 포함한다.

- pnpm `10.34.0`
- root workspace 설정과 lockfile
- 전체 workspace production/dev dependency가 설치된 `/app/node_modules`
- `apps/api` 소스
- Prisma generate 결과인 `apps/api/src/generated/prisma`
- TypeScript 빌드 결과인 `apps/api/dist`
- `packages/shared` 소스와 `dist` 빌드 결과
- 실행에 직접 필요하지 않은 Web package manifest
- 빌드 도구와 dev dependency

컨테이너 시작 명령은 다음과 같다.

```text
node apps/api/dist/server.js
```

## 6. Docker에 포함되지 않는 것

`.dockerignore`에 따라 다음 항목은 build context에서 제외된다.

- `.git`, `.github`
- host의 모든 `node_modules`
- 기존 `.next`, `dist`, coverage
- `.env`
- log 파일

의존성과 빌드 결과는 host 것을 복사하지 않고 이미지 빌드 과정에서 새로 생성한다. `.env`도 이미지에 복사하지 않고 Compose가 필요한 환경 변수를 컨테이너 실행 시 전달한다.

## 7. 이미지 저장 및 배포 상태

현재 Compose의 Web/API build에는 `image:` 이름이 없다. 따라서 `docker compose up --build` 시 Docker가 Compose 프로젝트 기준의 로컬 이미지 이름을 자동 생성하지만, 이 이미지를 외부 registry에 올리지는 않는다.

외부에서 내려받는 이미지는 다음 두 개다.

- `postgres:17-alpine`
- `caddy:2.10-alpine`

프로젝트에서 직접 빌드하는 이미지는 다음 두 개다.

- Web: `apps/web/Dockerfile`
- API: `apps/api/Dockerfile`

GitHub Actions에서도 이 이미지들은 smoke test runner 내부에서 임시로만 빌드된다. job 종료 후 재사용하거나 배포할 artifact로 보관하지 않는다.

## 8. 환경 변수와 포트

| 변수 | 기본값 | 현재 사용처 |
| --- | --- | --- |
| `APP_PORT` | `8080` | Caddy host port |
| `POSTGRES_PORT` | `5432` | PostgreSQL host port |
| `POSTGRES_DB` | `sourcewiki` | DB 생성 및 API 연결 |
| `POSTGRES_USER` | `sourcewiki` | DB 인증 및 API 연결 |
| `POSTGRES_PASSWORD` | `sourcewiki_local` | DB 인증 및 API 연결 |
| `LOG_LEVEL` | `info` | API log level |
| `API_PROXY_TARGET` | 개발 시 `http://localhost:4000` | Docker 밖에서 실행하는 Next.js의 `/api/*` rewrite |

`.env.example`의 `WEB_PORT`와 `API_PORT`는 전체 Docker Compose의 host port publish에는 현재 사용되지 않는다. Compose 내부 Web/API port는 각각 `3000`, `4000`으로 고정되어 있다.

## 9. 현재 상태에서의 주요 개선 후보

1. Web/API Dockerfile을 builder/runtime multi-stage로 분리해 최종 이미지 크기와 공격 표면 축소
2. Web은 Next.js standalone output을 사용하고 runtime에 필요한 파일만 복사
3. API는 production dependency와 `dist`, Prisma runtime 산출물만 runtime stage에 복사
4. 배포가 필요해질 때 GHCR 등 registry에 immutable tag로 push하는 별도 CD workflow 추가
5. 운영 환경에서는 PostgreSQL host port 비공개화, secret 외부 주입, TLS와 운영용 Caddy 설정 적용
6. 실제 DB 모델 도입 시 migration 생성·검증·배포 절차 추가

현재 Phase 1 목적은 로컬 실행 가능한 기반과 CI 검증이므로, 위 항목들은 운영 배포 단계에서 구현할 후속 작업이다.
