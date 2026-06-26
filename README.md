# SourceLink Wiki

AI 기술 자료의 출처와 맥락을 함께 쌓는 공개 지식 아카이브입니다. 현재 이메일 인증, 회전형 JWT 세션, 자료·댓글 CRUD, 서버 페이징, URL 본문 추출, 로컬 AI 요약 초안, Swagger/OpenAPI를 제공합니다.

## 요구 환경

- Node.js 24 LTS (`.node-version`: 24.16.0)
- pnpm 10.34.0
- Docker 29+와 Docker Compose

```bash
corepack enable
corepack prepare pnpm@10.34.0 --activate
pnpm install
```

## 로컬 개발

빠른 hot reload 개발은 PostgreSQL과 Mailpit만 Docker로 실행합니다.

```bash
cp .env.example .env
pnpm dev:infra
pnpm db:deploy
pnpm db:seed # 선택: 시연 계정 2명과 자료 13개 생성
pnpm dev
```

- Web: http://localhost:3000
- API live: http://localhost:4000/api/health/live
- API ready: http://localhost:4000/api/health/ready
- 자료 목록: http://localhost:3000/sources
- Swagger UI: http://localhost:4000/api/docs
- OpenAPI: http://localhost:4000/api/openapi.json
- Mailpit: http://localhost:8025

Web의 `/api/*` 요청은 Next.js rewrite를 통해 API로 전달됩니다.

## 전체 Docker 실행

```bash
cp .env.example .env
pnpm docker:up
```

서비스는 Caddy 단일 진입점 http://localhost:8080 에서 제공됩니다. 인증 메일은 http://localhost:8025 에서 확인할 수 있습니다. 종료 시 `pnpm docker:down`을 사용하며 데이터베이스 volume은 유지됩니다.

## AI 요약 모드

기본값은 `AI_MODE=disabled`이며 자료 CRUD와 댓글 기능에는 영향을 주지 않습니다.

```env
AI_MODE=disabled
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e4b
AI_TIMEOUT_MS=180000
```

- `disabled`: 요약 API가 503을 반환하고 사용자는 수동 요약을 유지합니다.
- `demo`: 고정 fixture를 반환하며 UI에 demo badge를 표시합니다.
- `ollama`: 로컬 Ollama `/api/generate`를 호출합니다.

로컬 Ollama smoke는 `AI_MODE=ollama OLLAMA_BASE_URL=http://127.0.0.1:11434` 조합을 권장합니다. 제출/운영 Phase 6 기본값은 안정성을 위해 `AI_MODE=demo`입니다.

## 인증 흐름

- 가입: `/signup`에서 계정을 만든 뒤 Mailpit의 인증 링크를 사용합니다.
- 로그인: `/login`에서 인증 완료 계정으로 로그인합니다.
- 세션: access 15분, refresh 14일 HttpOnly 쿠키를 사용하며 refresh마다 세션을 회전합니다.
- 복구: 프론트는 JWT를 읽거나 저장하지 않고 `GET /api/auth/me`로 사용자를 복구합니다.
- 개발용 `.env.example` secret과 SMTP 설정은 운영 환경에서 반드시 교체합니다.

실행 방식별 접속 주소, Mailpit 사용법, 회원·인증 토큰·세션 DB 조회, 쿠키 확인과 문제 해결은 [`docs/12-authentication-development-guide.md`](docs/12-authentication-development-guide.md)를 참고합니다.

## 자료·댓글 흐름

- 공개 조회: `/sources`, `/sources/[id]`에서 비회원도 자료와 댓글을 볼 수 있습니다.
- 작성: 이메일 인증 완료 사용자가 `/sources/new`에서 URL, 제목, 본문, 태그, 메모를 저장합니다.
- 수정·삭제: 작성자만 `/sources/[id]/edit`과 상세 화면의 삭제 동작을 사용할 수 있으며 API가 최종 권한을 검증합니다.
- 댓글: 상세 화면에서 인증 사용자가 작성하고 작성자만 수정·삭제합니다.
- 페이징: `page`, `limit` 기반 서버 페이징이며 seed 데이터는 2페이지 이상 확인할 수 있도록 13개 자료를 만듭니다.

개발 seed 계정은 다음과 같습니다. 비밀번호는 `SEED_USER_PASSWORD`이며 기본값은 `sourcewiki-demo-password`입니다.

```text
archive.owner@example.test
curious.reader@example.test
```

## 검증 명령

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm format:check
docker compose config --quiet
```

## 배포 기준

Phase 6 배포 기준은 새 AWS EC2, GHCR image registry, Caddy HTTPS, 실제 SMTP, 운영 `AI_MODE=demo`입니다. 운영 설정은 [`compose.production.yaml`](compose.production.yaml), [`infra/Caddyfile.production`](infra/Caddyfile.production), [`.env.production.example`](.env.production.example)을 기준으로 합니다.

배포 workflow는 `CI`가 `main`에서 성공하면 GHCR에 Web/API 이미지를 push하고 EC2에서 `docker compose pull`, migration deploy, `docker compose up -d`, HTTPS smoke를 실행합니다.

운영 smoke 대상:

- Web: `https://<domain>/`
- API ready: `https://<domain>/api/health/ready`
- Swagger UI: `https://<domain>/api/docs/`
- OpenAPI: `https://<domain>/api/openapi.json`
- 실제 SMTP 회원가입 인증 메일
- 자료·댓글 CRUD와 AI demo 요약 badge

## 제출 URL

배포 전 로컬 확인 URL:

- Web: `http://localhost:3000/`
- Swagger API 문서: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

배포 후 제출 URL 형식:

- 배포 서비스: `https://<domain>/`
- Swagger API 문서: `https://<domain>/api/docs/`
- OpenAPI JSON: `https://<domain>/api/openapi.json`

## 모노레포 구조

```text
apps/web             Next.js App Router, 인증·자료·댓글 화면
apps/api             Express API, Prisma, health/auth/source/comment/OpenAPI endpoint
packages/shared      API schema와 공유 TypeScript 타입
infra/Caddyfile      same-origin reverse proxy
compose.yaml         web/api/db/Mailpit/Caddy 로컬 stack
docs                 제품·기술 설계 문서
```

## 개발 문서

- [`docs/11-current-infrastructure.md`](docs/11-current-infrastructure.md): CI와 Docker 기반 구조
- [`docs/12-authentication-development-guide.md`](docs/12-authentication-development-guide.md): 인증 실행·접속·데이터 확인 가이드
- [`docs/13-deployment-runbook.md`](docs/13-deployment-runbook.md): Phase 6 EC2/GHCR 배포 runbook

## Health 계약

- `GET /api/health/live`: API process가 요청을 받을 수 있는지 확인
- `GET /api/health/ready`: 실제 PostgreSQL `SELECT 1` 연결 확인
- `GET /api/openapi.json`: OpenAPI 3.1 문서
- `GET /api/docs`: Swagger UI

모든 응답에는 추적 가능한 `requestId`가 포함됩니다. Ollama는 이후 Phase에서도 핵심 서비스 readiness 조건에 포함하지 않습니다.
