# SourceLink Wiki

AI 기술 자료의 출처와 맥락을 함께 쌓는 공개 지식 아카이브입니다. 현재 이메일 인증, 회전형 JWT 세션, 로그인 상태 복구를 포함한 Phase 2 인증 흐름을 제공합니다.

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
pnpm dev
```

- Web: http://localhost:3000
- API live: http://localhost:4000/api/health/live
- API ready: http://localhost:4000/api/health/ready
- Mailpit: http://localhost:8025

Web의 `/api/*` 요청은 Next.js rewrite를 통해 API로 전달됩니다.

## 전체 Docker 실행

```bash
cp .env.example .env
pnpm docker:up
```

서비스는 Caddy 단일 진입점 http://localhost:8080 에서 제공됩니다. 인증 메일은 http://localhost:8025 에서 확인할 수 있습니다. 종료 시 `pnpm docker:down`을 사용하며 데이터베이스 volume은 유지됩니다.

## 인증 흐름

- 가입: `/signup`에서 계정을 만든 뒤 Mailpit의 인증 링크를 사용합니다.
- 로그인: `/login`에서 인증 완료 계정으로 로그인합니다.
- 세션: access 15분, refresh 14일 HttpOnly 쿠키를 사용하며 refresh마다 세션을 회전합니다.
- 복구: 프론트는 JWT를 읽거나 저장하지 않고 `GET /api/auth/me`로 사용자를 복구합니다.
- 개발용 `.env.example` secret과 SMTP 설정은 운영 환경에서 반드시 교체합니다.

실행 방식별 접속 주소, Mailpit 사용법, 회원·인증 토큰·세션 DB 조회, 쿠키 확인과 문제 해결은 [`docs/12-authentication-development-guide.md`](docs/12-authentication-development-guide.md)를 참고합니다.

## 검증 명령

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config --quiet
```

## 모노레포 구조

```text
apps/web             Next.js App Router와 서비스 셸
apps/api             Express API, Prisma, health/auth endpoint
packages/shared      API schema와 공유 TypeScript 타입
infra/Caddyfile      same-origin reverse proxy
compose.yaml         web/api/db/Mailpit/Caddy 로컬 stack
docs                 제품·기술 설계 문서
```

## 개발 문서

- [`docs/11-current-infrastructure.md`](docs/11-current-infrastructure.md): CI와 Docker 기반 구조
- [`docs/12-authentication-development-guide.md`](docs/12-authentication-development-guide.md): 인증 실행·접속·데이터 확인 가이드

## Health 계약

- `GET /api/health/live`: API process가 요청을 받을 수 있는지 확인
- `GET /api/health/ready`: 실제 PostgreSQL `SELECT 1` 연결 확인

모든 응답에는 추적 가능한 `requestId`가 포함됩니다. Ollama는 이후 Phase에서도 핵심 서비스 readiness 조건에 포함하지 않습니다.
