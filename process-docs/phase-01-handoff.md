# SourceLink Wiki Phase 1 작업 인계서

> - 마지막 갱신: 2026-06-19 (Asia/Seoul)
> - 브랜치: `main`
> - 현재 기준 커밋: `3053e26 docs: document current CI and container architecture`
> - 원격 상태: `main`과 `origin/main`이 `3053e26`으로 일치
> - Phase 상태: 기반 구현 완료, 다음 기능 단계는 Phase 2 인증

## 1. 이 문서의 사용 목적

이 문서는 새 세션이나 다른 PC에서 작업을 이어갈 때 Phase 1의 구현 맥락과 검증 상태를 복구하기 위한 기준 문서다.

다음 단계 작업을 시작할 때는 이 문서를 먼저 읽고, 세부 설계는 관련 `docs/` 문서를 함께 확인한다. 현재 코드가 이 문서보다 변경되었을 수 있으므로 작업 시작 직후 `git status`, 현재 branch, 최신 commit을 다시 확인한다.

## 2. Phase 1 목표와 완료 범위

Phase 1의 목표는 빈 저장소에 실행 가능한 풀스택 기반과 자동 검증 환경을 만드는 것이었다.

- pnpm 모노레포: `apps/web`, `apps/api`, `packages/shared`
- Next.js App Router 웹 애플리케이션
- Express API와 공통 오류, request ID, 구조화 로그
- Prisma 7과 PostgreSQL 연결 및 readiness 검사
- Caddy same-origin reverse proxy
- Docker Compose 전체 실행 환경
- lint, typecheck, test, build, format 검사
- GitHub Actions CI와 Docker Compose smoke test
- 로컬 실행 및 인프라 구조 문서

인증, 사용자 테이블, 이메일 인증, 세션, 자료·댓글 CRUD는 아직 구현하지 않았다. 다음 기능 단계는 `docs/09-development-roadmap.md`의 Phase 2 인증이다.

## 3. 확정된 기술과 구조

| 영역            | 결정                                                |
| --------------- | --------------------------------------------------- |
| Node.js         | 24 LTS, `.node-version`은 24.16.0                   |
| Package manager | pnpm 10.34.0, lockfile 커밋                         |
| Frontend        | Next.js 16.2.9, React 19.2.7, App Router            |
| Backend         | Express 5.2.1, TypeScript, Zod, Pino                |
| Database        | PostgreSQL 17, Prisma 7.8 driver adapter 방식       |
| Proxy           | Caddy 2.10, `/api/*`는 API, 나머지는 Web            |
| 상태 공유       | `@sourcewiki/shared`의 Zod schema와 TypeScript type |

Web 페이지는 Server Component가 기본이며, 실제 health 요청을 수행하는 `SystemStatus`만 Client Component다.

전체 Docker 요청 흐름은 다음과 같다.

```text
사용자 또는 CI
      |
      | http://localhost:${APP_PORT:-8080}
      v
    Caddy
      |-- /api/* --> API:4000 --> PostgreSQL:5432
      `-- 그 외  --> Web:3000
```

서비스 준비 순서는 `db healthy → api healthy → web healthy → caddy`다.

## 4. 구현된 주요 파일

```text
apps/web/
  src/app/                       App Router, metadata, 반응형 UI
  src/features/system-status/    API/DB 상태 Client Component와 테스트
  next.config.ts                 개발 환경 /api rewrite
  Dockerfile

apps/api/
  src/app.ts                     Express middleware와 route 조립
  src/modules/health/            live/ready endpoint
  src/middleware/                request ID, Pino, 공통 오류
  src/lib/database.ts            PrismaPg와 SELECT 1
  prisma/schema.prisma           아직 업무 model이 없는 Phase 1 schema
  Dockerfile

packages/shared/src/index.ts     health/API 오류 schema와 type
.github/workflows/ci.yml         quality 및 Compose smoke job
compose.yaml                     db/api/web/caddy 로컬 stack
infra/Caddyfile                  same-origin routing
docs/11-current-infrastructure.md CI/Docker/CD 상태 상세 설명
README.md                        설치, 로컬 실행, 검증 명령
```

Prisma client는 `apps/api/src/generated/`에 생성되며 Git에 커밋하지 않는다. `pnpm db:generate`, API build 또는 typecheck가 재생성한다.

## 5. 공개된 Phase 1 API

### `GET /api/health/live`

DB와 무관하게 API process가 요청을 받을 수 있는지 확인한다.

```json
{
  "data": { "status": "ok", "service": "api", "timestamp": "ISO-8601" },
  "meta": { "requestId": "uuid" }
}
```

### `GET /api/health/ready`

Prisma로 실제 `SELECT 1`을 실행한다. 성공 시 HTTP 200과 `database: up`, 실패 시 HTTP 503과 `database: down`을 반환한다.

모든 응답은 `x-request-id` header와 body의 `meta.requestId`를 연결한다. 알 수 없는 API path는 공통 `ROUTE_NOT_FOUND` 오류 구조를 사용한다.

## 6. GitHub Actions와 배포 상태

현재 `.github/workflows/ci.yml`에는 검증 전용 CI만 구현되어 있다.

### 실행 조건

- 모든 Pull Request
- `main` 브랜치 push
- 같은 Git ref의 이전 실행은 새 실행이 시작되면 취소

### `quality` job

PostgreSQL 17 service container와 함께 다음 순서로 실행한다.

```text
pnpm install --frozen-lockfile
→ lint
→ typecheck
→ test
→ build
→ format:check
```

### `compose-smoke` job

Web/API Docker 이미지를 runner 내부에서 빌드하고 `db`, `api`, `web`, `caddy`를 실행한 뒤 다음 경로를 확인한다.

```text
GET /
GET /api/health/live
GET /api/health/ready
```

검사가 끝나면 컨테이너와 CI용 volume을 제거한다. `quality`와 `compose-smoke`는 의존 관계가 없어 병렬 실행될 수 있다.

### 아직 구현되지 않은 CD

- Docker Hub 또는 GHCR 이미지 push
- 운영/스테이징 서버 배포
- 운영 secret 주입과 GitHub Environment 승인
- database migration 배포 절차
- 배포 후 health check와 자동 rollback

따라서 현재 흐름은 `push → CI 검증`까지다. `push → 운영 배포`는 수행하지 않는다. 자세한 Docker 이미지 내용과 후속 개선점은 `docs/11-current-infrastructure.md`를 참고한다.

## 7. Docker 이미지 및 Compose 상태

Compose가 실행하는 서비스는 다음 네 개다.

| 서비스  | 생성 방식                        | 외부 접근           |
| ------- | -------------------------------- | ------------------- |
| `db`    | `postgres:17-alpine` pull        | 기본 host port 5432 |
| `api`   | `apps/api/Dockerfile` 로컬 build | Caddy를 통해 접근   |
| `web`   | `apps/web/Dockerfile` 로컬 build | Caddy를 통해 접근   |
| `caddy` | `caddy:2.10-alpine` pull         | 기본 host port 8080 |

Web/API에는 `image:`와 registry 주소가 없다. 로컬 또는 CI runner 안에서 `sourcewiki-web:latest`, `sourcewiki-api:latest` 형태로 빌드될 뿐 외부 registry에 업로드되지 않는다.

두 Dockerfile은 현재 단일 stage다. 최종 이미지에 source, build tool, dev dependency가 남으므로 운영 배포 전에는 multi-stage runtime 이미지와 Next.js standalone output 적용을 검토한다.

## 8. 검증 이력과 현재 미확인 항목

Phase 1 구현 당시 다음 검증이 성공했다.

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`: shared 2개, API 4개, Web 2개
- `pnpm build`
- `pnpm format:check`
- `docker compose config --quiet`
- `git diff --check`
- Docker image build 및 `db → api → web → caddy` 전체 health check
- Caddy 경유 `/`, `/api/health/live`, `/api/health/ready` HTTP smoke test
- Chromium 1440×1000 및 390×844 반응형 렌더링
- 브라우저 console 오류와 warning 없음

2026-06-19 `3053e26` 기준으로 Docker 전체 stack을 다시 빌드했고 네 서비스가 모두 healthy가 되는 것을 확인했다. Caddy 경유 Web, API live, DB ready 응답도 성공했다.

Hybrid 개발 경로(`PostgreSQL만 Docker + pnpm dev`)의 최종 재검증은 완료로 기록하지 않는다. 확인 중 이미 3000/4000 port를 사용하는 개발 서버가 있어 새 실행이 충돌했고, 기존 서버 대상 HTTP 확인은 중단됐다. Phase 2 시작 전에 아래 절차로 한 번 확인한다.

## 9. 다음 작업 시작 절차

### 9.1 저장소와 환경 확인

```bash
git pull
git status
node --version
pnpm --version
docker --version
docker compose version
```

기준 버전은 Node 24 LTS와 pnpm 10.34.0이다. 예상하지 않은 변경 파일이나 이미 실행 중인 3000/4000 port process가 있으면 먼저 소유자와 목적을 확인하고 임의로 종료하거나 덮어쓰지 않는다.

### 9.2 의존성 준비

```bash
corepack enable
corepack prepare pnpm@10.34.0 --activate
pnpm install --frozen-lockfile
pnpm db:generate
```

### 9.3 Hybrid smoke test

터미널 1:

```bash
pnpm dev:infra
```

터미널 2:

```bash
pnpm dev
```

다음 네 경로를 확인한다.

```text
http://localhost:3000
http://localhost:4000/api/health/live
http://localhost:4000/api/health/ready
http://localhost:3000/api/health/ready  # Next rewrite
```

검증 후 DB는 `docker compose down`으로 종료한다. named volume을 삭제할 필요가 있을 때만 `--volumes`를 사용한다.

### 9.4 품질 게이트

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config --quiet
git diff --check
```

Supertest가 임시 localhost socket을 열기 때문에 제한된 sandbox에서는 `pnpm test`가 `listen EPERM`으로 실패할 수 있다. 일반 로컬 환경이나 GitHub Actions에서 재검증한다.

## 10. 알려진 주의점

- Caddy local 설정은 의도적으로 HTTP `:80`을 사용한다. HTTP/2, HTTP/3, 자동 HTTPS 비활성 warning은 로컬 환경에서 정상이다.
- `.env.example`의 credential은 로컬 전용이며 운영 secret으로 재사용하지 않는다.
- Compose 기본 외부 port는 Caddy 8080, PostgreSQL 5432다. Web/API는 host에 직접 publish하지 않는다.
- Next production container에서는 Caddy가 `/api`를 직접 분기한다. Next rewrite 기본값은 development에서만 `http://localhost:4000`을 사용한다.
- `.env.example`의 `WEB_PORT`, `API_PORT`는 현재 Compose host port publish에 사용되지 않는다.
- Prisma schema에는 아직 업무 model과 migration이 없다.
- Dockerfile 최적화와 CD는 Phase 1 완료 조건에 포함되지 않았다.

## 11. Phase 2 시작점

Phase 2 구현 전에 다음 문서를 순서대로 확인한다.

1. `docs/02-requirements.md`: 인증 요구사항과 제품 범위
2. `docs/04-database-design.md`: users, email verification, refresh session 데이터 모델
3. `docs/05-api-design.md`: 인증 API 계약과 오류 형식
4. `docs/06-frontend-architecture.md`: Web 상태 및 API 접근 구조
5. `docs/07-backend-architecture.md`: API module, service, repository 경계
6. `docs/09-development-roadmap.md`: Phase 2 완료 조건
7. `docs/11-current-infrastructure.md`: CI, Docker, 향후 CD 제약

구현 시작 순서는 DB model 및 migration → 인증 domain/service → API endpoint → Web 인증 UI → 테스트 → Docker/CI 회귀 검증을 기본으로 한다. 구체 계약이 설계 문서와 충돌하면 임의로 결정하지 말고 변경 이유와 영향을 먼저 정리한다.

## 12. Phase 1 커밋 이력

```text
106ea83 chore: configure pnpm monorepo tooling
dfb0af4 feat(api): add health and database foundation
6da5d9d feat(web): build editorial foundation shell
5f06b69 chore(infra): add container stack and CI checks
1df6ea5 docs: add phase one implementation handoff
010a06d style(web): simplify landing page design
3053e26 docs: document current CI and container architecture
```
