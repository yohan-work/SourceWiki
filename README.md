# SourceLink Wiki

AI 기술 자료의 출처와 맥락을 함께 쌓는 공개 지식 아카이브입니다. 현재 Phase 1에서는 Next.js, Express, PostgreSQL이 연결된 프로젝트 기반과 상태 화면을 제공합니다.

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

빠른 hot reload 개발은 PostgreSQL만 Docker로 실행합니다.

```bash
cp .env.example .env
pnpm dev:infra
pnpm dev
```

- Web: http://localhost:3000
- API live: http://localhost:4000/api/health/live
- API ready: http://localhost:4000/api/health/ready

Web의 `/api/*` 요청은 Next.js rewrite를 통해 API로 전달됩니다.

## 전체 Docker 실행

```bash
cp .env.example .env
pnpm docker:up
```

서비스는 Caddy 단일 진입점 http://localhost:8080 에서 제공됩니다. 종료 시 `pnpm docker:down`을 사용하며 데이터베이스 volume은 유지됩니다.

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
apps/api             Express API, Prisma, health endpoint
packages/shared      API schema와 공유 TypeScript 타입
infra/Caddyfile      same-origin reverse proxy
compose.yaml         web/api/db/Caddy 로컬 stack
docs                 제품·기술 설계 문서
```

## Health 계약

- `GET /api/health/live`: API process가 요청을 받을 수 있는지 확인
- `GET /api/health/ready`: 실제 PostgreSQL `SELECT 1` 연결 확인

모든 응답에는 추적 가능한 `requestId`가 포함됩니다. Ollama는 이후 Phase에서도 핵심 서비스 readiness 조건에 포함하지 않습니다.
