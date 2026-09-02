# 20. 발표 예상 질문 답변 카드

## 이 장에서 답할 수 있게 되는 것

- 예상 질문에 30초로 답하기
- 각 답변의 근거 파일 대기

이 문서는 프로젝트의 사실을 바탕으로 답변을 연습하는 카드다. **발표에서 그대로 말할 30초 대본**이 필요할 때 본다. 질문을 빨리 훑으며 스스로 점검하려면 [22장 질문지](./22-question-sheet.md)를 쓴다. 각 답변 뒤의 **근거**를 직접 확인해 외우기보다 설명할 수 있게 한다.

## Backend · JWT 인증

### JWT 토큰에는 어떤 정보를 포함했나요?

**30초 답변:** “사용자 ID인 `sub`, access/refresh 구분용 `type`, 세션 추적용 `jti`, 발급자·대상인 issuer/audience, 발급·만료 시각을 넣었습니다. 비밀번호, 이메일, 닉네임 같은 민감하거나 자주 바뀌는 정보는 넣지 않았습니다. access는 15분, refresh는 14일이고 서로 다른 secret으로 서명했습니다.”

**근거:** `apps/api/src/lib/jwt.ts:10` (`AuthTokenPayload` claim 목록), `:19` (`signAuthToken`, 15분/14일).

**꼬리 질문 — jti가 왜 필요한가?** refresh token을 DB의 `refresh_sessions`와 연결하고, 회전한 이전 토큰이 재사용됐는지 감지하기 위해서다.

## Database · 테이블 관계

### 테이블 관계를 어떤 기준으로 설계했나요?

**30초 답변:** “도메인에서 누가 데이터를 소유하는지와 한쪽에 몇 개가 연결되는지로 설계했습니다. 사용자는 여러 자료·댓글·세션을 가지므로 1:N, 자료와 태그는 서로 여러 개를 연결하므로 `source_tags`를 둔 N:M입니다. 자료 삭제 시 의미가 함께 사라지는 댓글·파일은 cascade, 사용자와 자료처럼 기록 보존 판단이 필요한 관계는 restrict를 사용했습니다.”

**근거:** `apps/api/prisma/schema.prisma:57` (`Source`), `:130`·`:140` (`Tag`·`SourceTag`), `:85` (`SourceLike` 복합 키).

**꼬리 질문 — tag 이름을 Source에 배열로 넣지 않은 이유는?** 태그 중복을 정규화하고, 하나의 태그로 여러 자료를 조회하며, 태그 속성을 확장하기 쉽게 하기 위해서다.

## Frontend · Store 상태관리

### 상태 관리는 어떤 라이브러리를 사용했나요?

**30초 답변:** “TanStack Query를 서버 상태 관리에 사용했습니다. 별도 global store는 두지 않았고, 로그인 사용자·자료 목록처럼 API가 진실인 데이터는 Query cache, 입력값·로딩 버튼·미리보기는 React Hook Form과 useState로 나눴습니다.”

**근거:** `apps/web/src/lib/query/query-provider.tsx:6`, `apps/web/src/features/auth/use-me-query.ts:8`, `apps/web/src/features/sources/source-form.tsx:115`.

### 어떤 데이터를 상태 관리로 관리했나요?

**답변:** “`['auth', 'me']` 로그인 사용자, 자료 목록/상세/파일 응답은 Query cache에 두었습니다. 폼 텍스트, 선택 파일, 추출 미리보기, 로그아웃 진행 상태는 화면 지역 상태입니다.”

**근거:** `apps/web/src/features/sources/source-api.ts:38` (`sourceKeys`), `apps/web/src/features/auth/use-me-query.ts:8`.

### 이 라이브러리를 선택한 이유는 무엇인가요?

**답변:** “공유할 데이터 대부분이 서버 데이터였기 때문입니다. fetch, cache, loading/error, mutation 뒤 cache invalidation을 한 도구로 처리해 Store에 API 응답을 중복 저장하지 않았습니다.”

**근거:** `apps/web/src/lib/query/query-provider.tsx:6` (기본 옵션), `apps/web/src/features/sources/source-form.tsx:144` (mutation 뒤 재검증).

## Frontend · API 연동과 에러

### API 요청은 어떤 방식으로 호출했고 어디에서 관리했나요?

**답변:** “브라우저 fetch를 공통 `apiFetch`로 감쌌고, auth/source/user처럼 feature별 API 모듈이 endpoint를 관리합니다. 컴포넌트는 URL 대신 업무 함수만 호출합니다.”

**근거:** `apps/web/src/lib/api/api-client.ts:48` (`apiFetch`), `apps/web/src/features/sources/source-api.ts:46` (`sourceApi`).

### 인증 토큰은 어떻게 전달하나요?

**답변:** “서버가 httpOnly 쿠키로 설정하고 `credentials: include` 요청에서 브라우저가 자동 전달합니다. localStorage에는 저장하지 않습니다.”

**근거:** `apps/web/src/lib/api/api-client.ts:59` (`credentials: 'include'`), `apps/api/src/modules/auth/auth.routes.ts:22` (`setAuthCookies`).

### 프론트엔드 API 에러는 어떻게 처리하나요?

**답변:** “공통 래퍼가 백엔드 오류 JSON을 `ApiError`로 바꿉니다. 폼은 fieldErrors를 입력칸에, 일반 message를 root 오류에 표시하고, 네트워크 오류는 별도 안내를 보여 줍니다.”

**근거:** `apps/web/src/lib/api/api-client.ts:3` (`ApiError`), `:23` (`parseError`), `apps/api/src/middleware/error-handler.ts:10`.

## Frontend · 로그인과 회원가입

### 로그인 상태는 어디에 저장되고 새로고침 뒤 어떻게 유지되나요?

**답변:** “토큰은 httpOnly 쿠키, 사용자 표시 정보는 TanStack Query cache에 있습니다. 새로고침으로 메모리 캐시는 사라져도 쿠키는 남고 `/api/auth/me`를 다시 요청해 상태를 복구합니다.”

**근거:** `apps/api/src/modules/auth/auth.routes.ts:22` (쿠키), `apps/web/src/features/auth/use-me-query.ts:8` (`/me` 재조회).

### 인증이 필요한 페이지 접근은 어떻게 제어하나요?

**답변:** “프로필·자료 작성 폼은 `useMeQuery` 결과가 없으면 로그인 페이지로 보내 UX를 제어합니다. 다만 실제 보안은 API middleware가 access token·이메일 인증·작성자 권한을 검사해서 보장합니다.”

**근거:** `apps/web/src/features/sources/source-form.tsx:86` (화면 redirect), `apps/api/src/middleware/authenticate.ts:6`, `apps/api/src/middleware/authorize.ts:19`.

### 메일 인증은 어떤 방식인가요?

**답변:** “가입 시 비밀번호 hash와 미인증 계정을 저장하고, 랜덤 토큰의 hash와 만료 시각을 DB에 저장합니다. SMTP로 원본 토큰이 든 링크를 보내고, 링크를 열면 API가 hash·만료·사용 여부를 검사한 뒤 `emailVerifiedAt`을 기록합니다. 개발은 Mailpit, 운영은 실제 Gmail SMTP를 사용합니다.”

**근거:** `apps/api/src/modules/auth/auth.service.ts:35` (`issueVerification`), `:111` (`verifyEmail`).

## Docker·Cloud 꼬리 질문

### Docker Compose를 왜 사용했나요?

**답변:** “Web, API, DB, Mailpit, Caddy의 실행 환경과 연결 관계를 선언해 로컬·CI에서 같은 구조를 재현하기 위해서입니다. health check와 volume도 함께 정의했습니다.”

**근거:** `compose.yaml:33` (api 서비스와 health check), `compose.yaml:91` (caddy).

### 배포 흐름을 설명해 주세요.

**답변:** “main의 CI가 성공하면 Deploy workflow가 Web/API 이미지를 GHCR에 Git SHA 태그로 push합니다. Azure VM은 그 이미지를 pull하고, migration을 Azure PostgreSQL에 적용한 다음 Compose로 Web·API·Caddy를 실행합니다. Caddy가 HTTPS와 `/api` 라우팅을 맡습니다.”

**근거:** `.github/workflows/deploy.yml:48` (이미지 push), `:82` (서버 배포), `infra/Caddyfile.production`.

## Frontend · 게시판 CRUD와 페이징

### 게시글 작성부터 목록 갱신까지 설명해 주세요

**30초 답변:** "이 프로젝트에서 게시글은 `Source`(자료)입니다. 폼에서 `useMutation`으로 `POST /api/sources`를 호출하면 API가 로그인·이메일 인증·입력 검증을 차례로 확인하고 201로 응답합니다. 성공하면 `invalidateQueries`로 자료 목록 캐시를 무효화해서 목록이 자동으로 최신화되고, 방금 만든 자료의 상세 화면으로 이동합니다."

**근거:** `apps/web/src/features/sources/source-form.tsx:115` (`useMutation`), `:144` (무효화), `apps/api/src/modules/sources/source.routes.ts:120` (`POST /api/sources`).

**꼬리 질문 — 목록을 다시 안 부르고 화면에 끼워 넣으면 안 되나?** 가능하지만 정렬·필터·페이지 조건에 따라 그 자료가 실제로 첫 페이지에 와야 하는지 화면이 판단해야 한다. 서버 기준으로 다시 받는 편이 정확하다.

### 페이징은 어떻게 구현했나요?

**30초 답변:** "offset 방식입니다. `page`와 `limit`을 쿼리로 받아 `skip`과 `take`로 자르고, 목록과 총개수를 한 트랜잭션에서 함께 조회해 `totalItems`, `totalPages`를 내려 줍니다. `limit`은 최대 50으로 제한했고, 정렬은 `createdAt desc, id desc`로 두 번째 기준까지 둬서 같은 시각의 자료가 페이지 경계에서 중복되거나 누락되지 않게 했습니다."

**근거:** `packages/shared/src/index.ts:160` (`paginationQuerySchema`), `apps/api/src/modules/sources/source.service.ts:146` (`listSources`).

**꼬리 질문 — offset의 단점은?** 뒤 페이지로 갈수록 건너뛰는 비용이 커지고, 보는 도중 새 글이 추가되면 항목이 밀린다. 규모가 커지면 cursor(keyset) 방식으로 바꿀 수 있고, 이미 인덱스가 그 순서로 잡혀 있다.

### 남의 글을 수정하려 하면 어디서 막히나요?

**30초 답변:** "세 겹입니다. 화면에서는 작성자가 아니면 수정 버튼을 보여 주지 않고, API는 `authenticate`와 `requireVerifiedUser`로 신원을 확인하며, 마지막으로 service의 `assertOwner`가 자료의 `userId`와 요청자를 비교해 403을 반환합니다. 앞의 둘을 우회해도 마지막에서 막힙니다."

**근거:** `apps/api/src/modules/sources/source.service.ts:326` (`assertOwner`), `apps/api/src/middleware/authenticate.ts:6`.

## Frontend · 렌더링 방식

### 이 프로젝트는 SSR인가요 CSR인가요?

**30초 답변:** "둘 다 씁니다. 목록·상세 같은 첫 화면은 Next.js 서버가 API에서 데이터를 받아 HTML에 담아 보냅니다. 그 결과를 `dehydrate`로 TanStack Query 캐시에 심어 클라이언트가 이어받기 때문에 첫 화면에서 같은 요청을 다시 보내지 않습니다. 이후 저장·댓글 같은 상호작용은 브라우저가 직접 API를 호출합니다."

**근거:** `apps/web/src/app/sources/page.tsx:36`·`:61` (서버 조회와 `HydrationBoundary`), `apps/web/src/lib/api/server-api.ts:7` (`serverApiFetch`).

**꼬리 질문 — 서버에서 요청하는데 로그인 상태는 어떻게 아는가?** 서버에는 브라우저가 없으므로 `next/headers`로 요청에 실려 온 쿠키를 읽어 API에 그대로 전달한다.

## Backend · 보안 꼬리 질문

### 쿠키를 쓰면 CSRF 위험이 있지 않나요?

**30초 답변:** "맞습니다. 그래서 변경 요청은 `Origin` 헤더가 서비스 주소와 정확히 같을 때만 통과시킵니다. `Origin`은 브라우저가 붙이고 자바스크립트가 위조할 수 없어서, 다른 사이트에서 쿠키를 실어 보낸 요청을 걸러 냅니다. 쿠키의 `sameSite` 설정과 함께 두 겹으로 막았습니다."

**근거:** `apps/api/src/middleware/origin.ts:8` (`verifyOrigin`), `apps/api/src/modules/auth/auth.routes.ts:22` (쿠키 `sameSite`).

**꼬리 질문 — CORS 설정은 왜 없나?** 브라우저 입장에서 Web과 API가 같은 주소이기 때문이다. 개발은 Next.js 프록시가, 운영은 Caddy가 같은 도메인 안에서 API로 넘긴다.

### 무차별 대입 공격은 어떻게 막았나요?

**답변:** "경로별로 요청 횟수를 제한했습니다. 회원가입은 1시간에 5회, 인증 메일 재전송은 1시간에 3회, 로그인은 15분에 10회입니다. 메일 발송처럼 비용이 드는 작업일수록 촘촘하게 잡았습니다."

**근거:** `apps/api/src/middleware/rate-limit.ts:3` (`createRateLimit`), `apps/api/src/modules/auth/auth.routes.ts:58` (가입 5회/시간).

### 파일 업로드는 어떻게 검증했나요?

**답변:** "확장자와 MIME 타입이 짝이 맞는지 함께 확인하고, 10MB를 넘으면 거절합니다. 저장할 때는 원래 파일명을 쓰지 않고 UUID로 새 이름을 만들어 덮어쓰기와 경로 조작을 막았습니다. 원래 이름은 DB에 따로 보관해 다운로드할 때 되돌려 줍니다."

**근거:** `apps/api/src/modules/files/file.service.ts:51` (`validateUpload`), `apps/api/src/modules/files/multipart.ts:5` (스트림 상한).

## 최종 점검

각 답변을 말한 뒤 반드시 다음을 스스로 확인한다.

1. “왜?”라는 꼬리 질문에 설계 이유를 말할 수 있는가?
2. 근거가 되는 파일 하나를 말할 수 있는가?
3. 현재 구현의 한계와 개선 가능성을 과장 없이 말할 수 있는가?

---

다음 장 → [21. 최종 소크라틱 점검](./21-final-socratic-checklist.md)
