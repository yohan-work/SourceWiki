# 21. 최종 소크라틱 점검

## 이 장에서 답할 수 있게 되는 것

- 답하지 못한 질문을 어느 파일로 되돌아가 확인할지 정하기

이 장의 목표는 답을 읽는 것이 아니라, 답을 못 했을 때 **어느 파일·어느 문서로 돌아가야 하는지** 아는 것이다.

## 단계 1: 코드 없이 설명하기

각 질문에 30초 안에 답한다.

1. SourceWiki에서 Web, API, DB는 각각 무엇을 책임지는가?
2. 브라우저가 DB에 직접 연결하지 않는 이유는?
3. TanStack Query와 useState/React Hook Form의 상태를 왜 나누었는가?
4. access/refresh token을 왜 두 개로 나누었는가?
5. refresh token 재사용이 왜 위험한가?
6. Tag를 배열이 아니라 별도 테이블·연결 테이블로 둔 이유는?
7. Docker Compose와 Caddy가 각각 해결하는 문제는?
8. 개발 Mailpit과 운영 SMTP의 차이는?
9. migration이 seed와 다른 이유는?
10. 사용자가 다른 사람 자료 수정 API를 호출하면 어디서 막히는가?
11. 자료를 저장하면 목록 화면이 어떻게 최신 상태가 되는가?
12. 목록을 나눠 가져오는 방식은 무엇이고 단점은 무엇인가?
13. 첫 화면 데이터는 누가 가져오는가? 브라우저인가 서버인가?
14. CORS 설정이 없는데 왜 문제가 되지 않는가?
15. 파일은 왜 JSON이 아니라 FormData로 보내는가?

## 단계 2: 코드 근거 찾기

아래 질문의 답을 파일을 열어 증명한다.

| 질문 | 먼저 열 곳 | 다음으로 열 곳 |
| --- | --- | --- |
| JWT claim·만료 | `apps/api/src/lib/jwt.ts:10` (`AuthTokenPayload`) | `:19` (`signAuthToken`, 15분/14일) |
| 쿠키 옵션 | `apps/api/src/modules/auth/auth.routes.ts:22` (`setAuthCookies`) | `apps/web/src/lib/api/api-client.ts:59` (`credentials`) |
| 로그인 사용자 상태 | `apps/web/src/features/auth/use-me-query.ts:8` (`useMeQuery`) | `apps/web/src/lib/query/query-provider.tsx:6` (`QueryProvider`) |
| 401 → refresh | `apps/web/src/lib/api/api-client.ts:68` (401 재시도) | `apps/api/src/modules/auth/auth.service.ts:159` (`refresh`) |
| 갱신 요청이 한 번만 나가는 이유 | `apps/web/src/lib/api/api-client.ts:16` (`refreshPromise`) | — |
| 자료 작성 권한 | `apps/api/src/modules/sources/source.routes.ts:120` (middleware 순서) | `apps/api/src/middleware/authorize.ts:19` (`requireVerifiedUser`) |
| 본인 글만 수정·삭제 | `apps/api/src/modules/sources/source.service.ts:326` (`assertOwner`) | `apps/api/src/modules/comments/comment.service.ts:54` (댓글 쪽) |
| 입력 검증과 필드 오류 | `apps/api/src/middleware/validate.ts:6` (`validateBody`) | `apps/web/src/features/sources/source-form.tsx:152` (`setError`) |
| 공통 오류 형식 | `apps/api/src/middleware/error-handler.ts:10` (`errorHandler`) | `apps/web/src/lib/api/api-client.ts:3` (`ApiError`) |
| DB 관계 | `apps/api/prisma/schema.prisma:57` (`Source`) | `apps/api/prisma/migrations/` (적용 이력) |
| 목록 갱신 | `apps/web/src/features/sources/source-form.tsx:142` (`onSuccess`) | `apps/web/src/features/sources/source-api.ts:38` (`sourceKeys`) |
| 페이징 | `packages/shared/src/index.ts:160` (`paginationQuerySchema`) | `apps/api/src/modules/sources/source.service.ts:146` (`listSources`) |
| 검색·필터 | `packages/shared/src/index.ts:169` (`sourceListQuerySchema`) | `apps/api/src/modules/sources/source.service.ts:118` (`sourceListWhere`) |
| 서버 렌더링 | `apps/web/src/app/sources/page.tsx:36` (서버 조회) | `apps/web/src/lib/api/server-api.ts:7` (`serverApiFetch`) |
| CSRF 방어 | `apps/api/src/middleware/origin.ts:8` (`verifyOrigin`) | `apps/api/src/modules/auth/auth.routes.ts:22` (`sameSite`) |
| 요청 횟수 제한 | `apps/api/src/middleware/rate-limit.ts:3` (`createRateLimit`) | `apps/api/src/modules/auth/auth.routes.ts:58` (가입 5회/시간) |
| 파일 검증 | `apps/api/src/modules/files/file.service.ts:51` (`validateUpload`) | `apps/api/src/modules/files/multipart.ts:5` (스트림 상한) |
| API 문서 생성 | `apps/api/src/openapi/document.ts:32` (`z.toJSONSchema`) | `apps/api/src/openapi/openapi.routes.ts:8` (`/api/docs`) |
| 배포 | `.github/workflows/deploy.yml:48` (이미지 push) | `:82` (서버 배포), `infra/Caddyfile.production` |

> 줄 번호는 작성 시점의 위치다. 어긋나면 괄호 안의 **심볼 이름으로 검색**한다.

## 단계 3: 꼬리 질문으로 사고 넓히기

| 기본 답 | 꼬리 질문 | 좋은 답의 방향 |
| --- | --- | --- |
| Query를 썼다 | 왜 global store가 아닌가? | 서버 상태의 source of truth·cache 필요성 |
| 쿠키를 쓴다 | localStorage보다 항상 안전한가? | XSS 노출 감소와 CSRF/Origin 고려를 함께 말함 |
| JWT를 쓴다 | JWT만으로 logout 가능한가? | refresh session DB의 revoke가 필요함 |
| Prisma를 쓴다 | DB 제약이 필요 없는가? | ORM과 PostgreSQL 제약은 함께 필요함 |
| Caddy를 쓴다 | API 포트를 공개하지 않는 이유는? | same-origin·TLS·공격면 축소 |
| 목록을 invalidate한다 | 응답을 캐시에 직접 끼워 넣으면 안 되나? | 정렬·필터·페이지 조건은 서버가 판단해야 정확함 |
| 페이징을 했다 | 100페이지째도 똑같이 빠른가? | offset의 건너뛰기 비용과 cursor 대안 |
| 서버에서 먼저 가져온다 | 그럼 Query는 왜 필요한가? | 첫 화면 이후의 변경·갱신 담당 |
| Origin을 검사한다 | 헤더는 위조할 수 없나? | 브라우저가 붙이므로 JS가 못 바꿈, 서버 간 요청은 별개 |

## 단계 4: 장애를 역으로 추론하기

### 사례 A — 가입 버튼 뒤 503, users 테이블에는 행 존재

1. 무엇이 성공했는가? User와 verification token 저장.
2. 다음 실패 지점은? SMTP 메일 발송.
3. 재가입이 맞는가? 아니다. SMTP 수정 후 재전송이 맞다.

### 사례 B — 새로고침 후 헤더가 로그인으로 보임

1. Query cache는 새로고침 때 유지되는가? 메모리 cache라 사라진다.
2. 복구 수단은? 브라우저 cookie + `/api/auth/me`.
3. `/me`가 401이면? refresh 가능성을 공통 apiFetch가 판단한다.

### 사례 C — DBeaver에 테이블이 안 보임

1. migration이 실제로 실패했는가? `No pending migrations`이면 아닐 수 있다.
2. 먼저 확인할 것은? 현재 연결한 database가 `sourcewiki`인지, schema가 `public`인지.
3. API와 DBeaver가 같은 `DATABASE_URL` 대상인가?

## 발표 직전 최종 체크

- 각 기술을 “무엇을 썼다”가 아니라 “어떤 문제를 해결한다”로 설명한다.
- 코드 근거를 하나 이상 제시한다.
- 구현하지 않은 기능을 구현했다고 말하지 않는다.
- 보안은 프론트 redirect 하나가 아니라 cookie/API middleware/DB 상태가 함께 만든다고 설명한다.
- AI는 현재 demo 모드임을 명확히 말한다.

---

다음 장 → [22. 예상 질문 질문지](./22-question-sheet.md)
