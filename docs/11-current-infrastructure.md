# 현재 CI 및 컨테이너 구조

> 확인 기준: 2026-06-25, Phase 5 완료 이후

## 전체 구조

현재 저장소는 pnpm workspace 기반 모노레포이며 실행 단위는 Web, API, PostgreSQL, Mailpit, Caddy다. 전체 Docker 환경에서는 Caddy가 외부 요청을 받는 단일 진입점이고 `/api/*` 요청은 API로, 나머지는 Web으로 전달한다.

```text
사용자 또는 CI
      |
      | http://localhost:${APP_PORT:-8080}
      v
    Caddy
      |-- /api/*  -> API (Express, port 4000) -> PostgreSQL (port 5432)
      `-- 그 외   -> Web (Next.js, port 3000)

개발 인증 메일: API -> Mailpit (SMTP 1025, UI 8025)
```

| 구성 요소 | 구현 | 역할 |
| --- | --- | --- |
| `apps/web` | Next.js 16, React 19 | 인증, 자료, 댓글, AI 요약 검토 UI |
| `apps/api` | Express 5, Prisma 7 | health, auth, source, comment, URL extract, AI summarize, OpenAPI |
| `packages/shared` | TypeScript, Zod | Web/API 공용 schema와 타입 |
| `db` | PostgreSQL 17 Alpine | 애플리케이션 데이터베이스 |
| `mailpit` | Mailpit | 개발·CI 이메일 인증 확인 |
| `caddy` | Caddy 2.10 Alpine | Web/API same-origin reverse proxy |

## GitHub Actions

워크플로는 [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) 한 개이며 이름은 `CI`다.

### 실행 조건

- 모든 Pull Request
- `main` 브랜치 push
- 동일 Git ref의 새 실행이 시작되면 이전 실행 취소

### `quality` job

PostgreSQL service container를 띄운 뒤 기본 품질 gate를 실행한다.

1. checkout
2. pnpm `10.34.0`, Node.js `24.16.0` 설정
3. `pnpm install --frozen-lockfile`
4. PostgreSQL readiness wait
5. `pnpm db:deploy`
6. `pnpm lint`
7. `pnpm typecheck`
8. `pnpm test`
9. `pnpm build`
10. `pnpm format:check`

테스트 DB URL은 `127.0.0.1`을 사용해 GitHub Actions의 IPv6/localhost 연결 흔들림을 피한다.

### `compose-smoke` job

실제 Docker Compose stack을 runner에서 빌드하고 Caddy 경유 smoke를 실행한다.

1. `docker compose config --quiet`
2. `docker compose up --build --wait --wait-timeout 180`
3. `/`
4. `/api/health/live`
5. `/api/health/ready`
6. `/api/sources`
7. `/api/openapi.json`
8. `/api/docs/`
9. 실패 시 `docker compose logs`
10. 항상 `docker compose down --volumes`

### `browser-e2e` job

Chromium Playwright를 설치하고 hybrid 개발 방식으로 E2E를 실행한다.

1. checkout
2. pnpm/Node 설정
3. `pnpm install --frozen-lockfile`
4. `pnpm exec playwright install --with-deps chromium`
5. `pnpm dev:infra`
6. PostgreSQL readiness wait
7. `pnpm db:deploy`
8. `pnpm db:seed`
9. `pnpm test:e2e`
10. 항상 `docker compose down --volumes`

### `Deploy` workflow

[`Deploy`](../.github/workflows/deploy.yml)는 `CI` workflow가 `main`에서 성공하면 실행된다. 수동 실행도 지원한다.

- Web/API image를 GHCR에 `<git-sha>`와 `main` tag로 push
- EC2에 `compose.production.yaml`과 `infra/Caddyfile.production` 업로드
- EC2에서 `.env.production` 존재 확인
- GHCR login 후 `docker compose pull`
- `docker compose run --rm api pnpm --filter @sourcewiki/api db:deploy`
- `docker compose up -d`
- HTTPS Web, health, OpenAPI, Swagger smoke

필수 secret은 `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `GHCR_TOKEN`, `APP_DOMAIN`이다.

## Compose 서비스

[`compose.yaml`](../compose.yaml)은 로컬 개발과 CI smoke 기준의 stack이다.

### `mailpit`

- 이미지: `axllent/mailpit:v1.27`
- host port: SMTP `${MAILPIT_SMTP_PORT:-1025}`, UI `${MAILPIT_UI_PORT:-8025}`
- `/mailpit readyz` health check
- 운영 배포에서는 제외한다.

### `db`

- 이미지: `postgres:17-alpine`
- host port: `${POSTGRES_PORT:-5432}`
- 데이터: `postgres_data` named volume
- `pg_isready` health check
- 운영 배포에서는 host port를 공개하지 않는다.

### `api`

- build: `apps/api/Dockerfile`
- 내부 port: `4000`
- `DATABASE_URL`은 Compose service 이름 `db`를 사용
- SMTP는 로컬 Compose에서 `mailpit:1025` 사용
- `/api/health/ready` health check
- Web/API host port는 직접 publish하지 않고 Caddy로 접근

### `web`

- build: `apps/web/Dockerfile`
- 내부 port: `3000`
- server-side API 요청은 `API_INTERNAL_URL=http://api:4000`
- `/` health check

### `caddy`

- 이미지: `caddy:2.10-alpine`
- host port: `${APP_PORT:-8080}` -> container `80`
- 설정: [`infra/Caddyfile`](../infra/Caddyfile)
- `caddy_data`, `caddy_config` named volume 사용

서비스 준비 순서는 다음과 같다.

```text
db healthy + mailpit healthy -> api healthy -> web healthy -> caddy start
```

## Docker 이미지 상태

로컬 `compose.yaml`은 build 기반 이미지를 사용한다. 운영 [`compose.production.yaml`](../compose.production.yaml)은 GHCR image를 사용한다.

Deploy workflow가 push하는 운영 image tag는 다음과 같다.

- `ghcr.io/<owner>/sourcewiki-api:<git-sha>`
- `ghcr.io/<owner>/sourcewiki-web:<git-sha>`
- `ghcr.io/<owner>/sourcewiki-api:main`
- `ghcr.io/<owner>/sourcewiki-web:main`

EC2 배포는 rollback을 위해 `<git-sha>` tag를 사용한다.

## 환경 변수와 포트

| 변수 | 기본값 | 사용처 |
| --- | --- | --- |
| `APP_PORT` | `8080` | Caddy host port |
| `POSTGRES_PORT` | `5432` | 로컬 PostgreSQL host port |
| `MAILPIT_SMTP_PORT` | `1025` | 로컬 Mailpit SMTP |
| `MAILPIT_UI_PORT` | `8025` | 로컬 Mailpit UI |
| `POSTGRES_DB` | `sourcewiki` | DB 생성 및 API 연결 |
| `POSTGRES_USER` | `sourcewiki` | DB 인증 |
| `POSTGRES_PASSWORD` | `sourcewiki_local` | DB 인증 |
| `LOG_LEVEL` | `info` | API log level |
| `APP_URL` | 개발 `http://localhost:3000` 또는 Docker `http://localhost:8080` | 이메일 링크, Origin 기준 |
| `API_PROXY_TARGET` | `http://localhost:4000` | Next.js 개발 rewrite |
| `API_INTERNAL_URL` | `http://localhost:4000` 또는 `http://api:4000` | Web server-side API 호출 |
| `COOKIE_SECURE` | `false` | 운영 HTTPS에서는 `true` |
| `AI_MODE` | `disabled` | `disabled`, `demo`, `ollama` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama mode |
| `OLLAMA_MODEL` | `gemma4:e4b` | Ollama mode |
| `AI_TIMEOUT_MS` | `180000` | AI 요청 timeout |

운영 Phase 6 기본값은 `COOKIE_SECURE=true`, `AI_MODE=demo`, 실제 SMTP 설정이다.

## 남은 Phase 6 작업

1. EC2 서버 bootstrap과 `/opt/sourcewiki/.env.production` 배치
2. GitHub repository secret 등록
3. DNS A record를 EC2 public IP로 연결
4. 첫 Deploy workflow 실행
5. HTTPS 회원가입, CRUD, AI demo smoke
6. Web/API Dockerfile multi-stage runtime image 최적화
7. `pg_dump` backup과 restore dry-run

자세한 배포 절차는 [`docs/13-deployment-runbook.md`](./13-deployment-runbook.md)를 기준으로 한다.
