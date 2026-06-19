# SourceLink Wiki Phase 1 작업 인계서

> - 마지막 갱신: 2026-06-19 (Asia/Seoul)
> - 브랜치: `main`
> - 시작 기준 커밋: `2c0413a chore : planning details data(structure)`
> - 상태: Phase 1 로컬 커밋 완료·push 전, hybrid 개발 경로 최종 smoke test만 남음

## 1. 현재 목표와 범위

Phase 1의 목표는 빈 저장소에 실행 가능한 풀스택 기반을 만드는 것이다.

- pnpm 모노레포: `apps/web`, `apps/api`, `packages/shared`
- Next.js App Router 서비스 셸
- Express API와 공통 오류·request ID·구조화 로그
- Prisma 7 + PostgreSQL readiness
- Caddy same-origin reverse proxy
- Docker Compose 전체 stack
- lint, typecheck, test, build, GitHub Actions CI

인증, 사용자 테이블, 자료·댓글 CRUD는 아직 구현하지 않았다. 다음 기능 단계는 `docs/09-development-roadmap.md`의 Phase 2 인증이다.

## 2. 확정된 기술과 제품 결정

| 영역            | 결정                                                  |
| --------------- | ----------------------------------------------------- |
| Node.js         | 24 LTS, `.node-version`은 24.16.0                     |
| Package manager | pnpm 10.34.0, lockfile 커밋                           |
| Frontend        | Next.js 16.2.9, React 19.2.7, App Router              |
| Backend         | Express 5.2.1, TypeScript, Zod, Pino                  |
| Database        | PostgreSQL 17, Prisma 7.8 driver adapter 방식         |
| Proxy           | Caddy 2.10, `/api/*`는 API, 나머지는 web              |
| UI              | 따뜻한 중성 배경·잉크색·청록 포인트의 에디토리얼 위키 |
| 상태 공유       | `@sourcewiki/shared`의 Zod schema와 TypeScript type   |

웹 페이지는 Server Component가 기본이며, 실제 health 요청을 수행하는 `SystemStatus`만 Client Component다.

## 3. 구현된 주요 파일

```text
apps/web/
  src/app/                       서비스 셸, metadata, responsive CSS
  src/features/system-status/    API/DB 상태 Client Component와 테스트
  Dockerfile

apps/api/
  src/app.ts                     Express middleware와 route 조립
  src/modules/health/            live/ready endpoint
  src/middleware/                request ID, Pino, 공통 오류
  src/lib/database.ts            PrismaPg와 SELECT 1
  prisma/schema.prisma           업무 model 없는 Phase 1 schema
  Dockerfile

packages/shared/src/index.ts     health/API 오류 schema와 type
compose.yaml                     db/api/web/caddy
infra/Caddyfile                  same-origin routing
.github/workflows/ci.yml         quality 및 Compose smoke jobs
README.md                        로컬 실행과 구조 설명
```

Prisma client는 `apps/api/src/generated/`에 생성되며 Git에 커밋하지 않는다. `pnpm install` 후 `pnpm db:generate` 또는 API build/typecheck가 재생성한다.

## 4. 공개된 Phase 1 API

### `GET /api/health/live`

DB와 무관하게 API process 생존 상태를 반환한다.

```json
{
  "data": { "status": "ok", "service": "api", "timestamp": "ISO-8601" },
  "meta": { "requestId": "uuid" }
}
```

### `GET /api/health/ready`

Prisma로 실제 `SELECT 1`을 실행한다. 성공 시 200과 `database: up`, 실패 시 503과 `database: down`을 반환한다.

모든 응답은 `x-request-id` header와 body의 `meta.requestId`를 연결한다. 알 수 없는 API path는 공통 `ROUTE_NOT_FOUND` 오류 구조를 사용한다.

## 5. 완료된 검증

다음 검증은 성공했다.

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
  - shared 2개
  - API 4개
  - web 2개
- `pnpm build`
- `pnpm format:check`
- `docker compose config --quiet`
- `git diff --check`
- Docker image build와 `db → api → web → caddy` 전체 health check
- Caddy 경유 `/`, `/api/health/live`, `/api/health/ready` HTTP smoke test
- 실제 Chromium 1440×1000 및 390×844 responsive 렌더링
- 모바일 `시스템 상태` anchor 이동과 API/DB `UP` 표시
- 브라우저 console 오류 0, warning 0

검증 스크린샷은 로컬 `output/playwright/`에 있으며 Git에서 제외된다.

Docker stack은 검증 후 `docker compose down`으로 종료했다. PostgreSQL named volume은 삭제하지 않았다.

## 6. 방금 중단된 위치

전체 Docker 실행 검증까지 끝난 뒤 hybrid 개발 경로를 검증하려고 다음 명령을 시작했으나 사용자 중단으로 종료됐다.

```bash
pnpm dev:infra
```

확인 결과 실행 중인 컨테이너는 없으므로 부분 실행 상태를 정리할 필요는 없다.

중단 후 Next 개발 모드에서 `API_PROXY_TARGET`이 없어도 `/api/*`를 `http://localhost:4000`으로 전달하도록 기본값을 추가했다. 이 마지막 수정 이후 hybrid smoke test는 아직 실행하지 않았다.

## 7. 다른 PC에서 이어서 실행하는 절차

### 7.1 저장소 동기화

Phase 1 구현은 역할별 로컬 커밋으로 정리했으며 아직 remote에 push하지 않았다.

```text
106ea83 chore: configure pnpm monorepo tooling
dfb0af4 feat(api): add health and database foundation
6da5d9d feat(web): build editorial foundation shell
5f06b69 chore(infra): add container stack and CI checks
```

다른 PC에서 이어가려면 이 PC에서 검토 후 `git push origin main`을 실행해야 한다. push는 사용자 검토 후 직접 진행한다.

push 완료 후 새 PC에서:

```bash
git pull
```

### 7.2 새 PC 준비

```bash
git pull
corepack enable
corepack prepare pnpm@10.34.0 --activate
pnpm install --frozen-lockfile
pnpm db:generate
```

Node 24 LTS와 Docker Desktop이 필요하다.

### 7.3 남은 hybrid smoke test

터미널 1:

```bash
pnpm dev:infra
```

터미널 2:

```bash
pnpm dev
```

다음 주소를 확인한다.

```text
http://localhost:3000
http://localhost:4000/api/health/live
http://localhost:4000/api/health/ready
http://localhost:3000/api/health/ready  # Next rewrite 검증
```

모두 정상이라면 `docker compose down`으로 DB container를 종료한다.

### 7.4 최종 품질 게이트

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config --quiet
git diff --check
```

Supertest가 임시 localhost socket을 열기 때문에 제한된 sandbox에서는 `pnpm test`가 `listen EPERM`으로 실패할 수 있다. 일반 로컬 PC나 CI에서는 정상 통과하며, 현재 세션에서도 권한 있는 로컬 실행으로 8개 테스트 통과를 확인했다.

## 8. 알려진 정상 동작과 주의점

- Caddy local 설정은 의도적으로 HTTP `:80`을 사용하므로 HTTP/2·HTTP/3·자동 HTTPS 비활성 warning은 정상이다. 운영 도메인 설정은 배포 Phase에서 추가한다.
- `.env.example`의 credential은 로컬 전용이다. 실제 secret으로 재사용하지 않는다.
- Compose 기본 외부 port는 `8080`, PostgreSQL hybrid port는 `5432`다.
- Next production container에서는 Caddy가 `/api`를 직접 분기한다. Next rewrite 기본값은 development에서만 활성화된다.
- `docs/`와 `planning/` 문서는 formatter 대상에서 제외해 기존 문서에 불필요한 diff가 생기지 않게 했다.

## 9. 다음 작업

1. 위 hybrid smoke test를 완료한다.
2. `git status`에서 Phase 1 파일만 변경됐는지 확인한다.
3. 로컬 커밋을 검토한 뒤 사용자가 직접 push한다.
4. Phase 2 인증 구현 전에 `docs/02-requirements.md`, `04-database-design.md`, `05-api-design.md`의 인증 계약을 다시 확인한다.
5. Phase 2는 users/email verification/refresh sessions migration부터 시작한다.
