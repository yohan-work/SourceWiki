# SourceLink Wiki Phase 3 작업 인계서

> - 마지막 갱신: 2026-06-23 (Asia/Seoul)
> - Phase 상태: Core CRUD 구현 완료, URL 추출·AI 요약은 Phase 4 이후

## 완료 범위

- `sources`, `comments`, `tags`, `source_tags` Prisma model과 migration
- 개발 seed: 인증 완료 사용자 2명, 자료 13개 이상, 댓글·태그
- Source 공개 목록·상세, 인증 생성, 작성자 수정·삭제 API
- Comment 공개 목록, 인증 생성, 작성자 수정·삭제 API
- 서버 페이징, 안정 정렬, tag upsert, source 삭제 cascade
- `requireVerifiedUser`, optional public auth, 이메일 중복 확인 UI
- `/sources`, `/sources/new`, `/sources/[id]`, `/sources/[id]/edit`와 댓글 UI
- Swagger UI `/api/docs`, OpenAPI `/api/openapi.json`
- Vitest 통합 테스트와 Playwright E2E 파일·CI job 추가

## 실행

```bash
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm db:deploy
pnpm db:seed
pnpm dev
```

주요 URL:

```text
Web: http://localhost:3000
Sources: http://localhost:3000/sources
Swagger: http://localhost:4000/api/docs
Mailpit: http://localhost:8025
```

Seed 계정:

```text
archive.owner@example.test / sourcewiki-demo-password
curious.reader@example.test / sourcewiki-demo-password
```

## 검증 상태

- 성공: `pnpm lint`
- 성공: `pnpm typecheck`
- 성공: `pnpm test` with PostgreSQL
- 성공: `pnpm build`
- 성공: migration 적용과 seed 2회 재실행
- 성공: Playwright CLI 수동 목록·상세 렌더링 확인 및 screenshot 저장
- 제한: 로컬 tool session에서 `pnpm test:e2e` runner가 장기 프로세스 출력/종료 제어 문제로 안정적으로 완료되지 않았다. 테스트 파일과 CI job은 추가되어 있으며 일반 터미널/CI에서 재검증 대상이다.

커밋 전 권장 재검증:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config --quiet
git diff --check
```

`pnpm test:e2e`는 로컬 일반 터미널 또는 CI에서 다시 확인한다. 특히 Mailpit API, seed 계정 로그인, source/comment CRUD, 작성자 UI 권한, 2페이지 seed 데이터 이동을 확인한다.

## 주요 변경 파일

```text
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/20260623000000_add_core_crud/migration.sql
apps/api/prisma/seed.ts
apps/api/src/middleware/authorize.ts
apps/api/src/middleware/validate.ts
apps/api/src/modules/sources/
apps/api/src/modules/comments/
apps/api/src/openapi/
apps/web/src/app/sources/
apps/web/src/features/sources/
apps/web/src/features/comments/
apps/web/src/lib/api/server-api.ts
e2e/core-crud.spec.ts
playwright.config.ts
.github/workflows/ci.yml
```

## 확인된 주의점

- Swagger UI `/api/docs`는 endpoint 자체와 OpenAPI JSON은 연결되어 있지만, Express 전역 `helmet()`의 기본 CSP가 Swagger UI의 inline script/style과 충돌할 수 있다. `curl` 성공만으로 충분하지 않으므로 브라우저에서 실제 렌더링을 확인해야 한다.
- `apps/api/prisma/seed.ts`는 production 실행을 막고 기본 DB URL/password fallback을 사용하지만, root `.env`를 직접 load하지 않는다. `DATABASE_URL` 또는 `SEED_USER_PASSWORD`를 바꿔 실행하려면 shell env로 export되어 있어야 한다.
- `validateQuery`는 현재 validation 실패 시 `fieldErrors`를 싣지 않는다. `validateBody`와 오류 계약을 맞추려면 pagination query 오류도 field별 메시지를 내려주도록 보강할 수 있다.
- 댓글 수정 UI는 빈 값 등 client validation 실패 시 저장을 막지만 별도 오류 문구를 보여주지 않는다. 기능 차단은 되지만 UX 보완 여지가 있다.
- E2E 파일은 추가됐지만 이번 tool session에서는 runner 완료까지 안정적으로 확인하지 못했다. CI 또는 일반 터미널에서 green 여부를 최종 기준으로 삼는다.

## 다음 단계

- Phase 4 URL 추출: DNS/redirect 단계별 public-host 검증, 2MB/10초 제한, 본문 추출 preview UI
- Phase 5 AI 요약: Ollama adapter, schema 검증, demo/disabled 모드
- Phase 6 배포: EC2, registry, migration deploy, HTTPS smoke
