# 14. Phase 3 테스트와 E2E 검증

## Phase 3에서 테스트가 늘어난 이유

Phase 2 인증 테스트는 로그인과 session이 핵심이었습니다. Phase 3에서는 사용자가 만든 자료와 댓글이 DB, API, Web UI를 모두 통과합니다.

```text
Prisma model
  ↓
API service와 route
  ↓
공유 schema
  ↓
Next.js 화면
  ↓
브라우저 사용자 흐름
```

그래서 단위별 테스트와 실제 브라우저 E2E를 함께 봐야 합니다.

## shared schema 테스트

공유 schema 테스트는 Web과 API가 같은 계약을 쓰는지 확인합니다.

```text
packages/shared/src/index.test.ts
```

Phase 3에서 확인하는 예시는 다음과 같습니다.

```text
공개 URL validation
pagination 기본값과 범위
빈 source patch 거부
```

이 테스트는 빠르게 실행되며, API와 Web 양쪽에 영향을 주는 계약 변경을 초기에 잡아줍니다.

## API 통합 테스트

자료와 댓글 API는 실제 PostgreSQL을 사용해 service 동작을 검증합니다.

```text
apps/api/src/modules/sources/source.integration.test.ts
```

주요 시나리오는 다음과 같습니다.

```text
자료 13개 생성
  ↓
1페이지와 2페이지 페이징 확인
  ↓
다른 사용자 수정 차단
  ↓
댓글 생성
  ↓
자료 삭제 시 댓글 cascade 확인
```

여기서 중요한 점은 mock DB가 아니라 실제 migration이 적용된 PostgreSQL을 사용한다는 것입니다. Prisma schema, migration SQL, service query가 함께 맞는지 확인할 수 있습니다.

## OpenAPI 문서 테스트

OpenAPI 문서는 JSON 구조가 맞아야 Swagger UI와 외부 도구에서 사용할 수 있습니다.

```text
apps/api/src/openapi/document.test.ts
```

테스트는 OpenAPI document가 유효한지, Phase 3 CRUD path가 들어 있는지 확인합니다.

```text
/sources
/sources/{id}
/sources/{id}/comments
/comments/{id}
```

단, 문서 validation이 성공해도 Swagger UI가 브라우저에서 정상 렌더링된다는 뜻은 아닙니다. Helmet CSP와 UI 렌더링은 별도로 확인합니다.

## Playwright E2E

브라우저 E2E는 실제 사용자가 보는 흐름을 확인합니다.

```text
e2e/core-crud.spec.ts
playwright.config.ts
```

현재 E2E는 세 가지 흐름을 담고 있습니다.

```text
1. 회원가입 → Mailpit 인증 → 로그인 상태 복구
2. seed 계정 로그인 → 자료 생성 → 댓글 작성 → 타인 권한 UI 차단 → 작성자 삭제
3. seed 자료 13개 기준 2페이지 이동
```

E2E를 실행하려면 infra, migration, seed가 먼저 준비되어야 합니다.

```bash
pnpm dev:infra
pnpm db:deploy
pnpm db:seed
pnpm test:e2e
```

`playwright.config.ts`의 web server는 `pnpm dev`로 Web과 API를 띄웁니다. CI에서는 Playwright browser 설치, infra 준비, migration, seed 후 E2E를 실행합니다.

## Mailpit을 E2E에서 쓰는 방식

회원가입 E2E는 실제 외부 이메일을 기다리지 않습니다. Mailpit HTTP API에서 test email을 찾고, 메일 본문의 verification URL을 꺼냅니다.

```text
POST /signup
  ↓
Mailpit /api/v1/messages polling
  ↓
메일 본문에서 /verify-email?token=... 추출
  ↓
브라우저가 인증 URL 방문
```

이 방식은 실제 SMTP 발송과 브라우저 인증 흐름을 함께 확인하면서도 외부 메일 서비스에 의존하지 않습니다.

## CI에서의 검증 구분

Phase 3 CI는 크게 세 축으로 나뉩니다.

```text
quality
  lint, typecheck, test, build, format

compose-smoke
  Docker stack build와 health/API smoke

browser-e2e
  Playwright browser flow
```

`compose-smoke`는 `/api/sources`, `/api/openapi.json`, `/api/docs/`까지 확인합니다. 다만 `/api/docs/`는 HTTP 성공만 확인하므로 브라우저 렌더링 확인과는 다릅니다.

## 자주 확인할 문제

### `pnpm test:e2e`가 멈춘 것처럼 보임

Playwright가 dev server를 함께 띄우고 browser를 실행하기 때문에 일반 단위 테스트보다 오래 걸립니다. 제한된 tool session에서는 장기 프로세스 출력/종료 제어가 불안정할 수 있으므로 일반 터미널이나 CI에서 최종 확인합니다.

### seed 계정 로그인이 실패함

`pnpm db:seed`가 실행됐는지 확인합니다. 기본 계정은 다음과 같습니다.

```text
archive.owner@example.test
curious.reader@example.test
```

비밀번호는 기본적으로 `sourcewiki-demo-password`입니다.

### 2페이지 테스트가 실패함

seed 자료가 13개 이상 있어야 기본 `limit=12`에서 두 번째 페이지가 생깁니다. DB를 초기화했다면 seed를 다시 실행합니다.

## 기억할 것

- Phase 3 검증은 DB, API, Web, 브라우저를 나눠서 봐야 합니다.
- seed는 단순 demo가 아니라 E2E와 페이징 검증의 전제입니다.
- Mailpit API를 쓰면 이메일 인증 E2E를 외부 서비스 없이 검증할 수 있습니다.
- OpenAPI validation과 Swagger 브라우저 렌더링은 서로 다른 확인 항목입니다.
- 제한된 tool session의 E2E 실패 또는 중단은 일반 터미널/CI에서 다시 판단합니다.
