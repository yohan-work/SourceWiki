# 22. 예상 질문 질문지

## 쓰는 법

1. **답을 손으로 가리고** 질문만 읽는다.
2. 소리 내어 답해 본다.
3. 내려서 답을 확인한다.
4. 막힌 번호를 적어 둔다. 그 번호가 다음에 공부할 순서다.

외우는 문서가 아니다. **말이 나오는지 확인하는 문서**다.

각 답 아래 **근거 코드**에 파일 위치를 적어 뒀다. 화면을 공유하며 "여기 있습니다" 하고 바로 열 수 있게 하기 위해서다. 줄 번호는 작성 시점의 위치이므로, 코드를 고친 뒤에는 **심볼 이름으로 검색**해서 찾는다.

| 문서 | 언제 쓰나 |
| --- | --- |
| **22장 (이 문서)** | 빨리 훑으며 스스로 점검할 때 |
| [20장 발표 답변 카드](./20-presentation-qa-cards.md) | 발표에서 그대로 말할 30초 대본이 필요할 때 |
| [21장 최종 소크라틱 점검](./21-final-socratic-checklist.md) | 못 답한 질문을 어느 파일로 돌아가 확인할지 |

---

## A. 전체 구조

### Q1. SourceWiki는 어떤 서비스인가요?

**한 줄 답** 웹에서 본 자료(링크·문서)를 저장하고 태그·댓글·파일로 정리하는 개인 지식 아카이브입니다.

**더 보기** [01장](./01-service-and-request.md)

---

### Q2. Web·API·DB는 각각 무엇을 하나요?

**한 줄 답** Web은 화면, API는 규칙 검사와 업무 처리, DB는 영구 보관입니다.

**쉽게 말하면** 가게로 치면 Web은 안내 창구, API는 실제 업무를 처리하는 직원, DB는 장부 보관소다.

**근거 코드**
- API가 제공하는 기능 목록 (라우터 mount) — `apps/api/src/app.ts:42`
- DB 연결 지점 — `apps/api/src/lib/database.ts:8`
**더 보기** [01장](./01-service-and-request.md)

---

### Q3. 브라우저가 데이터베이스에 직접 연결하면 안 되나요?

**한 줄 답** 안 됩니다. 브라우저는 사용자가 마음대로 조작할 수 있는 환경이라, DB 비밀번호와 권한 규칙을 브라우저에 보낼 수 없습니다.

**쉽게 말하면** 손님에게 금고 열쇠를 주지 않는 것과 같다. 직원(API)을 거쳐야 한다.

**근거 코드**
- `DATABASE_URL`은 서버 설정에만 있다 — `apps/api/src/config/env.ts:7`

---

### Q4. 폴더가 `apps/web`, `apps/api`, `packages/shared`로 나뉜 이유는?

**한 줄 답** 실행 책임이 다르기 때문입니다. Web은 화면, API는 서버, shared는 두 앱이 함께 쓰는 약속입니다.

**쉽게 말하면** 저장소는 하나지만 안에서 하는 일이 다른 세 방을 나눠 둔 것이다. 한 번에 함께 고칠 수 있어서 편하다.

**근거 코드**
- 워크스페이스 선언 — `pnpm-workspace.yaml`
**더 보기** [02장](./02-monorepo-and-frontend.md)

---

### Q5. `packages/shared`에는 무엇이 들어 있나요?

**한 줄 답** 요청·응답의 모양을 정의한 Zod schema와 TypeScript 타입입니다. Web과 API가 **같은 규칙**을 쓰게 합니다.

**쉽게 말하면** "회원가입 신청서 양식" 같은 것이다. 창구(Web)와 직원(API)이 같은 양식을 봐야 말이 통한다.

**근거 코드**
- 공용 schema와 타입 전부 — `packages/shared/src/index.ts`

---

### Q6. Zod와 schema가 무엇인가요?

**한 줄 답** schema는 지켜야 할 **양식·기준**이고, Zod는 그 양식을 코드로 만들고 검사까지 해 주는 도구입니다.

**쉽게 말하면** 놀이기구 앞의 "키 120cm 이상" 규칙이 schema, 키 재는 막대가 Zod다. Zod는 통과 여부만이 아니라 "5cm 모자랍니다"라는 이유까지 알려 준다.

**근거 코드**
- `passwordSchema` — 조건을 붙여 나가는 예 — `packages/shared/src/index.ts:35`
- `signupRequestSchema` — 칸 세 개짜리 양식 — `packages/shared/src/index.ts:50`
**더 보기** [02장](./02-monorepo-and-frontend.md)

---

### Q7. 왜 Node.js·PostgreSQL·Next.js를 골랐나요?

**한 줄 답** 프론트엔드와 백엔드를 **같은 언어(TypeScript)**로 쓰기 위해 Node.js를 골랐고, 그래서 검증 규칙과 타입을 `packages/shared`로 공유할 수 있습니다. 자료-태그-댓글처럼 관계가 분명한 데이터라 관계형 DB인 PostgreSQL을 골랐습니다.

**쉽게 말하면** 한 언어만 쓰면 양쪽을 오갈 때 머리를 바꿔 끼울 필요가 없다.

---

## B. 화면 상태 관리

### Q8. 상태 관리는 어떤 라이브러리를 사용했나요?

**한 줄 답** TanStack Query입니다. Redux나 Zustand 같은 전역 Store는 쓰지 않았습니다.

**근거 코드**
- `QueryProvider` 등록 — `apps/web/src/lib/query/query-provider.tsx:6`
**더 보기** [03장](./03-frontend-state-and-data-flow.md)

---

### Q9. 어떤 데이터를 상태 관리로 다뤘나요?

**한 줄 답** 서버가 진실인 데이터만입니다. 로그인 사용자, 자료 목록·상세, 댓글, 파일 목록입니다.

**쉽게 말하면** 폼에 타이핑 중인 글자, 버튼 로딩 표시처럼 **그 화면에서만 잠깐 필요한 값**은 `useState`와 React Hook Form이 맡는다. 서버에서 온 것과 화면에서만 쓰는 것을 나눈 것이다.

**근거 코드**
- `useMeQuery` — 로그인 사용자 — `apps/web/src/features/auth/use-me-query.ts:8`
- `sourceKeys` — 자료 관련 캐시 — `apps/web/src/features/sources/source-api.ts:38`

---

### Q10. 왜 Redux나 Zustand가 아닌가요?

**한 줄 답** 공유할 상태 대부분이 서버 데이터였기 때문입니다. TanStack Query가 요청·캐시·로딩·에러·갱신을 한 번에 처리해서, 전역 Store에 API 응답을 또 복사해 둘 필요가 없었습니다.

**쉽게 말하면** 창고(Store)를 따로 지어 서버 물건을 베껴 둘 필요가 없었다. 복잡한 전역 화면 상태가 생기면 그때 Zustand를 검토할 수 있다.

**근거 코드**
- 기본 옵션(재시도 1회, 포커스 재요청 끔) — `apps/web/src/lib/query/query-provider.tsx:6`

---

### Q11. query key가 무엇인가요?

**한 줄 답** 캐시에 붙이는 **이름표**입니다. `['sources']`는 자료 목록, `['source', id]`는 자료 하나, `['auth','me']`는 로그인 사용자입니다.

**쉽게 말하면** 사물함마다 이름표를 붙여 두는 것과 같다. 나중에 "이 이름표가 붙은 건 낡았으니 다시 가져와"라고 지목할 수 있다.

**근거 코드**
- `sourceKeys` — `apps/web/src/features/sources/source-api.ts:38`
- `userKeys` — `apps/web/src/features/users/user-api.ts:10`

---

### Q12. 자료를 저장하면 목록이 어떻게 자동으로 갱신되나요?

**한 줄 답** 저장에 성공하면 `invalidateQueries`로 `['sources']` 캐시를 "낡음"으로 표시합니다. 그러면 목록 화면이 알아서 다시 가져옵니다.

**쉽게 말하면** 이름표가 **앞부분만 같아도** 함께 표시된다. 그래서 지금 몇 페이지를 보고 있든, 어떤 검색어로 걸러 보고 있든 목록 전체가 갱신된다.

**근거 코드**
- 저장 성공 후 `onSuccess` — `apps/web/src/features/sources/source-form.tsx:142`
- `invalidateQueries` 호출 — `apps/web/src/features/sources/source-form.tsx:144`
**더 보기** [09b장](./09b-source-crud-complete-trace.md)

---

### Q13. `invalidateQueries`와 `setQueryData`는 무엇이 다른가요?

**한 줄 답** 전자는 "낡았다"고 표시해 **다시 가져오게** 하고(서버 요청 발생), 후자는 값을 **즉시 덮어씁니다**(요청 없음).

**쉽게 말하면** 로그인 직후 헤더 닉네임이 깜빡임 없이 바뀌는 게 후자다. 로그인 응답에 이미 사용자 정보가 들어 있어 다시 물어볼 필요가 없다.

**근거 코드**
- `invalidateQueries` — 다시 가져오게 — `apps/web/src/features/sources/source-form.tsx:144`
- `setQueryData` — 즉시 덮어쓰기 — `apps/web/src/features/auth/login-form.tsx:33`

---

## C. 렌더링

### Q14. 이 프로젝트는 SSR인가요 CSR인가요?

**한 줄 답** 둘 다 씁니다. 첫 화면은 서버가 데이터까지 채워 보내고, 이후 저장·댓글 같은 상호작용은 브라우저가 직접 API를 호출합니다.

**근거 코드**
- 서버에서 먼저 조회 — `apps/web/src/app/sources/page.tsx:36`
- `HydrationBoundary`로 넘김 — `apps/web/src/app/sources/page.tsx:61`
**더 보기** [03b장](./03b-server-rendering-and-hydration.md)

---

### Q15. 첫 화면 데이터는 누가 가져오나요?

**한 줄 답** Next.js 서버입니다. `serverApiFetch`로 API를 부르고, 결과를 HTML에 담아 보냅니다.

**쉽게 말하면** 서버가 밥상을 미리 차려서 내보낸다. 손님이 앉자마자 주문부터 하지 않아도 된다.

**근거 코드**
- `serverApiFetch` — `apps/web/src/lib/api/server-api.ts:7`

---

### Q16. hydration이 무엇인가요?

**한 줄 답** 서버가 가져온 데이터를 **브라우저의 캐시가 그대로 이어받는 것**입니다. 그래서 첫 화면에서 같은 요청을 다시 보내지 않습니다.

**쉽게 말하면** 차려진 밥상을 그대로 이어받아 계속 쓰는 것이다. 단, 서버와 브라우저가 **같은 이름표(query key)**를 써야 이어진다.

**근거 코드**
- 서버가 캐시에 심는 곳 `setQueryData` — `apps/web/src/app/sources/page.tsx:43`
- 브라우저가 이어받는 곳 — `apps/web/src/app/sources/page.tsx:61`

---
## D. API 연동과 에러 처리

### Q17. API 요청은 어떤 방식으로 호출하나요?

**한 줄 답** 브라우저의 `fetch`를 `apiFetch`라는 공통 함수로 감싸서 호출합니다. 별도 HTTP 라이브러리는 쓰지 않았습니다.

**근거 코드**
- `apiFetch` 공통 래퍼 — `apps/web/src/lib/api/api-client.ts:48`
**더 보기** [04장](./04-frontend-api-error-auth.md)

---

### Q18. API 호출 로직은 어디에서 관리하나요?

**한 줄 답** 기능별 API 파일에 모아 뒀습니다. `auth-api.ts`, `source-api.ts`, `user-api.ts`입니다.

**쉽게 말하면** 화면 컴포넌트는 URL을 몰라도 된다. `sourceApi.create(...)`처럼 **업무 이름**으로만 부른다. 나중에 주소가 바뀌어도 화면을 하나씩 고칠 필요가 없다.

**근거 코드**
- `authApi` — `apps/web/src/features/auth/auth-api.ts:10`
- `sourceApi` — `apps/web/src/features/sources/source-api.ts:46`

---

### Q19. 공통 API 요청 처리를 위해 어떤 구조를 썼나요?

**한 줄 답** `apps/web/src/lib/api/api-client.ts`의 `apiFetch` 하나가 **모든 요청의 공통 규칙**을 담당합니다.

**쉽게 말하면** 쿠키 포함, JSON 헤더 자동 설정, 10초 타임아웃, 오류를 `ApiError`로 변환, 401이면 토큰 갱신 후 한 번 재시도 — 이 다섯 가지를 한곳에서 처리한다. 각 화면이 따로 신경 쓰지 않는다.

**근거 코드**
- `apiFetch` 본체 — `apps/web/src/lib/api/api-client.ts:48`
- 401 재시도 · 갱신 한 번만 — `apps/web/src/lib/api/api-client.ts:68`

---

### Q20. API 요청 시 인증 토큰은 어떻게 전달하나요?

**한 줄 답** 직접 전달하지 않습니다. 서버가 httpOnly 쿠키로 심어 두고, `credentials: 'include'` 설정 덕에 **브라우저가 자동으로** 실어 보냅니다.

**쉽게 말하면** `Authorization` 헤더를 코드로 만들지 않고, localStorage에도 저장하지 않는다.

**근거 코드**
- `credentials: 'include'` — `apps/web/src/lib/api/api-client.ts:59`
- 쿠키를 심는 곳 `setAuthCookies` — `apps/api/src/modules/auth/auth.routes.ts:22`

---

### Q21. 프론트엔드에서 API 에러는 어떻게 처리하나요?

**한 줄 답** 공통 `apiFetch`가 서버 오류 JSON을 `ApiError` 객체로 바꿉니다. 화면은 `fieldErrors`가 있으면 해당 입력칸 아래에, 없으면 폼 위쪽에 메시지를 보여 줍니다.

**쉽게 말하면** "비밀번호는 8자 이상이어야 합니다"가 비밀번호 칸 아래 정확히 붙는 이유다.

**근거 코드**
- `ApiError` 클래스 — `apps/web/src/lib/api/api-client.ts:3`
- 오류 JSON을 바꾸는 `parseError` — `apps/web/src/lib/api/api-client.ts:23`
- 필드 오류를 입력칸에 붙이는 곳 — `apps/web/src/features/sources/source-form.tsx:152`

---

### Q22. 공통 에러 처리 구조는 무엇인가요?

**한 줄 답** 서버가 항상 `{ error: { code, message, requestId, fieldErrors? } }` 모양으로 보내고, 프론트는 그것을 `ApiError` 클래스 하나로 통일해 다룹니다.

**쉽게 말하면** 오류의 **모양이 항상 같아서** 화면마다 다르게 해석할 필요가 없다.

**근거 코드**
- 서버가 오류 모양을 만드는 곳 `errorHandler` — `apps/api/src/middleware/error-handler.ts:10`
- 프론트가 받아 통일하는 `ApiError` — `apps/web/src/lib/api/api-client.ts:3`
**더 보기** [04장](./04-frontend-api-error-auth.md), [05장](./05-backend-and-api.md)

---

### Q23. 요청이 너무 오래 걸리면 어떻게 되나요?

**한 줄 답** `AbortController`로 10초에서 끊고 `REQUEST_TIMEOUT` 오류로 바꿉니다. AI 요약처럼 오래 걸리는 요청만 따로 길게 잡았습니다.

**근거 코드**
- 기본 10초 타임아웃 — `apps/web/src/lib/api/api-client.ts:54`
- `REQUEST_TIMEOUT`으로 변환 — `apps/web/src/lib/api/api-client.ts:80`

---

### Q24. `requestId`는 왜 있나요?

**한 줄 답** 요청이 들어올 때 만들어져 **서버 로그와 오류 응답에 함께** 실립니다. 사용자가 이 값을 알려 주면 그 요청만 로그에서 정확히 찾을 수 있습니다.

**쉽게 말하면** 택배 송장 번호 같은 것이다.

**근거 코드**
- `requestId` 생성 — `apps/api/src/middleware/request-context.ts:10`
- 오류 응답에 실어 보내는 곳 — `apps/api/src/middleware/error-handler.ts:10`

---

## E. 로그인과 인증

### Q25. 로그인 상태 확인은 어떤 방식으로 처리하나요?

**한 줄 답** 프론트가 임의로 판단하지 않고, `useMeQuery`라는 Hook이 `GET /api/auth/me`를 호출해 **서버에 물어봅니다.** 사용자 정보가 오면 로그인, 401이면 비로그인(`null`)입니다.

**쉽게 말하면** "내가 로그인했나?"를 브라우저가 혼자 판단하지 않고 매번 서버에 확인받는다. 서버만이 진짜 답을 안다.

**근거 코드**
- `useMeQuery` — `apps/web/src/features/auth/use-me-query.ts:8`
- `GET /api/auth/me` route — `apps/api/src/modules/auth/auth.routes.ts:110`
**더 보기** [03장](./03-frontend-state-and-data-flow.md)

---

### Q26. 로그인하면 무엇이 생기나요?

**한 줄 답** 서버가 쿠키 두 개를 심어 줍니다. `access_token`(15분)과 `refresh_token`(14일)입니다.

**쉽게 말하면** 둘 다 httpOnly라 자바스크립트로 읽을 수 없다. `refresh_token`은 `/api/auth` 경로에만 실려 나가서, 평소 요청에는 아예 따라다니지 않는다.

**근거 코드**
- `setAuthCookies` — 쿠키 두 개 — `apps/api/src/modules/auth/auth.routes.ts:22`
- 만료 시간 15분 / 14일 — `apps/api/src/lib/jwt.ts:31`
**더 보기** [08장](./08-auth-complete-trace.md)

---

### Q27. 로그인 상태는 어디에 저장하나요?

**한 줄 답** 토큰은 브라우저의 httpOnly 쿠키에, 사용자 정보는 TanStack Query 캐시(`['auth','me']`)에 둡니다.

**쉽게 말하면** 출입증(토큰)은 브라우저 금고에 넣어 두고, 내 이름표(사용자 정보)는 화면 메모리에 둔다. **토큰 원문은 프론트엔드 코드가 절대 만지지 않는다.**

**근거 코드**
- 쿠키 옵션 (httpOnly·경로·기간) — `apps/api/src/modules/auth/auth.routes.ts:22`
- 사용자 정보 캐시 `['auth','me']` — `apps/web/src/features/auth/use-me-query.ts:8`

---

### Q28. 페이지 새로고침 시 로그인 상태는 어떻게 유지되나요?

**한 줄 답** 화면 메모리의 캐시는 사라지지만 **쿠키는 브라우저에 남습니다.** `useMeQuery`가 `/api/auth/me`를 다시 호출해 사용자 정보를 복구합니다.

**쉽게 말하면** 이름표는 사라져도 출입증이 남아 있어서, 다시 보여 주고 이름표를 새로 받는다.

**근거 코드**
- `useMeQuery`가 다시 물어보는 곳 — `apps/web/src/features/auth/use-me-query.ts:8`
- 쿠키를 검사하는 `authenticate` — `apps/api/src/middleware/authenticate.ts:6`

---

### Q29. 토큰이 만료되면 어떻게 되나요?

**한 줄 답** 401 응답 → `apiFetch`가 `/api/auth/refresh` 호출 → 새 토큰 쿠키 발급 → **원래 요청을 한 번 재시도**합니다. 갱신도 실패하면 다시 로그인해야 합니다.

**쉽게 말하면** 사용자는 아무것도 못 느낀다. 여러 요청이 동시에 401이 나도 갱신 요청은 **한 번만** 나간다.

**근거 코드**
- 401 감지 → 갱신 → 재시도 — `apps/web/src/lib/api/api-client.ts:68`
- 갱신 요청을 한 번만 묶는 `refreshPromise` — `apps/web/src/lib/api/api-client.ts:16`
- 서버의 `refresh` — `apps/api/src/modules/auth/auth.service.ts:159`
**더 보기** [04장](./04-frontend-api-error-auth.md)

---

### Q30. access token과 refresh token을 왜 나눴나요?

**한 줄 답** 짧게 쓰는 것과 오래 보관하는 것을 분리하기 위해서입니다. access는 15분이라 훔쳐도 금방 쓸모없어지고, refresh는 14일이지만 갱신할 때만 서버로 갑니다.

**쉽게 말하면** 매일 쓰는 임시 출입증과, 그걸 재발급받는 회원증을 나눈 것이다.

**근거 코드**
- 만료 시간을 정하는 곳 — `apps/api/src/lib/jwt.ts:31`
- 경로가 다른 두 쿠키 — `apps/api/src/modules/auth/auth.routes.ts:22`

---

### Q31. JWT에는 어떤 정보를 넣었나요?

**한 줄 답** 사용자 ID(`sub`), 토큰 종류(`type`), 세션 식별자(`jti`), 발급자·대상(`iss`/`aud`), 발급·만료 시각(`iat`/`exp`)입니다.

**쉽게 말하면** 이메일·닉네임·비밀번호처럼 **민감하거나 자주 바뀌는 값은 넣지 않는다.** JWT는 누구나 내용을 열어 볼 수 있기 때문이다. access와 refresh는 서로 다른 비밀키로 서명한다.

**근거 코드**
- `AuthTokenPayload` — 담는 claim 목록 — `apps/api/src/lib/jwt.ts:10`
- `signAuthToken` — 서명과 만료 — `apps/api/src/lib/jwt.ts:19`
**더 보기** [07장](./07-authentication-and-email.md)

---

### Q32. refresh token 재사용은 왜 위험한가요?

**한 줄 답** 이미 교체된 토큰이 다시 들어왔다는 건 **누군가 훔쳐 썼을 가능성**이 있다는 뜻입니다. 그래서 같은 세션 가족 전체를 무효로 만들고 다시 로그인시킵니다.

**쉽게 말하면** 토큰은 쓸 때마다 새것으로 바꿔 주고 옛것은 버린다. 버린 것이 돌아오면 경보를 울리는 셈이다.

**근거 코드**
- 재사용 감지와 세션 가족 무효화 — `apps/api/src/modules/auth/auth.service.ts:159`

---

### Q33. 로그아웃은 어떻게 처리하나요?

**한 줄 답** 서버가 쿠키를 지우고 DB의 refresh 세션을 무효로 만듭니다. 프론트는 `['auth','me']` 캐시를 `null`로 바꿔 헤더를 즉시 비로그인으로 바꿉니다.

**쉽게 말하면** JWT만으로는 로그아웃이 안 된다. 이미 발급된 토큰은 만료까지 유효하기 때문에, **서버 DB에서 세션을 지우는 절차**가 반드시 필요하다.

**근거 코드**
- 서버의 로그아웃 route — `apps/api/src/modules/auth/auth.routes.ts:105`
- 화면 캐시를 비우는 곳 — `apps/web/src/features/auth/auth-actions.tsx:40`

---

### Q34. 인증이 필요한 페이지 접근은 어떻게 제어하나요?

**한 줄 답** 화면은 로그인 정보가 없으면 로그인 페이지로 보냅니다. 다만 **이건 사용자 경험이고**, 진짜 차단은 API의 `authenticate`·`requireVerifiedUser`·작성자 확인이 합니다.

**쉽게 말하면** 화면에서 막는 것은 문 앞 안내판이고, API에서 막는 것이 실제 잠금장치다. 개발자 도구로 API를 직접 부를 수 있으니 안내판만으로는 부족하다.

**근거 코드**
- 화면 redirect (UX) — `apps/web/src/features/sources/source-form.tsx:86`
- `authenticate` (신원) — `apps/api/src/middleware/authenticate.ts:6`
- `requireVerifiedUser` (이메일 인증) — `apps/api/src/middleware/authorize.ts:19`

---

### Q35. 토큰을 localStorage에 두지 않은 이유는?

**한 줄 답** localStorage는 자바스크립트가 읽을 수 있어서, 악성 스크립트가 들어오면(XSS) 토큰을 그대로 가져갑니다. httpOnly 쿠키는 자바스크립트가 못 읽습니다.

**쉽게 말하면** 대신 쿠키는 자동으로 실려 가서 CSRF 위험이 생기는데, 그건 `Origin` 검사와 `sameSite` 설정으로 막았다(Q57 참고).

**근거 코드**
- `httpOnly` 쿠키 설정 — `apps/api/src/modules/auth/auth.routes.ts:20`
- CSRF를 막는 `verifyOrigin` — `apps/api/src/middleware/origin.ts:8`

---

## F. 회원가입과 메일 인증

### Q36. 이메일 중복은 어떻게 검사하나요?

**한 줄 답** 두 단계입니다. 입력 중에는 `POST /api/auth/check-email`로 미리 알려 주고, 실제 가입 시 서버가 다시 확인해 이미 있으면 **409 `EMAIL_ALREADY_EXISTS`**로 거절합니다. DB의 email 컬럼에도 unique 제약이 걸려 있습니다.

**쉽게 말하면** 안내는 화면에서, 최종 판정은 서버에서, 마지막 안전장치는 DB에서 — 세 겹이다.

**근거 코드**
- 가입 시 409로 거절하는 곳 — `apps/api/src/modules/auth/auth.service.ts:72`
- 사전 확인 route `check-email` — `apps/api/src/modules/auth/auth.routes.ts:45`

---

### Q37. 비밀번호는 어떻게 저장하나요?

**한 줄 답** bcrypt로 해시해서 저장합니다. 원문은 어디에도 남기지 않습니다.

**쉽게 말하면** 해시는 되돌릴 수 없는 변환이다. DB가 통째로 유출돼도 비밀번호를 바로 알아낼 수 없다. 로그인할 때는 입력값을 같은 방식으로 변환해 비교한다.

**근거 코드**
- bcrypt 해시 후 저장 — `apps/api/src/modules/auth/auth.service.ts:72`

---

### Q38. 메일 인증은 어떤 방식인가요?

**한 줄 답** 일회용 토큰이 든 링크를 메일로 보냅니다. 링크를 열면 서버가 토큰의 유효성·만료·사용 여부를 확인하고 `emailVerifiedAt`을 기록합니다.

**쉽게 말하면** 인증을 마치기 전에는 비밀번호가 맞아도 로그인이 안 된다(403). 개발에서는 Mailpit이 메일을 가로채 화면으로 보여 주고, 운영은 실제 SMTP로 보낸다.

**근거 코드**
- `issueVerification` — 토큰 발급과 메일 — `apps/api/src/modules/auth/auth.service.ts:35`
- `verifyEmail` — 링크 검증 — `apps/api/src/modules/auth/auth.service.ts:111`
**더 보기** [07장](./07-authentication-and-email.md)

---

### Q39. 인증 토큰을 DB에 그대로 저장하지 않는 이유는?

**한 줄 답** DB에는 토큰의 **해시**만 저장합니다. 원문은 메일 링크에만 있습니다.

**쉽게 말하면** 비밀번호와 같은 원리다. DB가 유출돼도 그 값으로 남의 계정을 인증할 수 없다.

**근거 코드**
- 토큰 해시만 저장하는 곳 — `apps/api/src/modules/auth/auth.service.ts:35`
- `tokenHash` 컬럼 — `apps/api/prisma/schema.prisma:151`

---

### Q40. 가입은 됐는데 메일이 안 오면 무슨 일인가요?

**한 줄 답** 계정과 토큰 저장은 성공했고 **메일 발송 단계만 실패**한 것입니다(503). 다시 가입할 게 아니라 재전송이 맞습니다.

**쉽게 말하면** "무엇이 실패했나"만이 아니라 **"무엇은 이미 성공했나"**를 나눠 보는 것이 원인을 찾는 요령이다.

**근거 코드**
- 저장 뒤 메일을 보내는 순서 — `apps/api/src/modules/auth/auth.service.ts:35`
- 메일 발송 담당 — `apps/api/src/integrations/mail.ts`

---
## G. 게시판·댓글·페이징

### Q41. 과제의 "게시글"은 이 프로젝트의 무엇인가요?

**한 줄 답** `Source`(자료)입니다. "댓글"은 `Comment` 그대로입니다.

**쉽게 말하면** 이름만 다르고 구조는 게시판과 같다. 글에 제목·본문·작성자가 있고 댓글이 달린다. 여기에 태그·첨부파일·좋아요가 더 붙는다.

**근거 코드**
- `Source` 모델 — `apps/api/prisma/schema.prisma:57`
- `Comment` 모델 — `apps/api/prisma/schema.prisma:115`

---

### Q42. 게시글 작성부터 목록 갱신까지 설명해 주세요.

**한 줄 답** 폼에서 `useMutation` → `POST /api/sources` → 서버가 로그인·이메일 인증·입력값을 차례로 확인 → 201 응답 → `['sources']` 캐시 무효화 → 상세 화면으로 이동.

**쉽게 말하면** 화면 → 기능별 API 함수 → 공통 `apiFetch` → 프록시 → Route+middleware → Service → DB. **이 여섯 칸이 모든 기능에서 똑같다.**

**근거 코드**
- 화면의 `useMutation` — `apps/web/src/features/sources/source-form.tsx:115`
- `POST /api/sources` route — `apps/api/src/modules/sources/source.routes.ts:120`
- `createSource` — `apps/api/src/modules/sources/source.service.ts:305`
**더 보기** [09b장](./09b-source-crud-complete-trace.md)

---

### Q43. 왜 생성은 201이고 삭제는 204인가요?

**한 줄 답** 201은 "새 리소스가 만들어졌다", 204는 "성공했지만 돌려줄 내용이 없다"는 뜻입니다.

**쉽게 말하면** 200(그냥 성공)과 구분해서, 응답 코드만 봐도 무슨 일이 있었는지 알 수 있게 한 것이다.

**근거 코드**
- 생성 201 — `apps/api/src/modules/sources/source.routes.ts:120`
- 삭제 204 — `apps/api/src/modules/sources/source.routes.ts:144`

---

### Q44. 본인 글만 수정·삭제되게 어떻게 막았나요?

**한 줄 답** 세 겹입니다. ① 화면에서 작성자가 아니면 버튼을 숨기고 ② API가 로그인·이메일 인증을 확인하고 ③ Service의 `assertOwner`가 글의 작성자 ID와 요청자를 비교합니다.

**쉽게 말하면** ①은 편의, ③이 진짜 방어선이다.

**근거 코드**
- `assertOwner` — 작성자 대조 — `apps/api/src/modules/sources/source.service.ts:326`

---

### Q45. 남의 글 수정 API를 직접 호출하면 어디서 막히나요?

**한 줄 답** 로그인을 안 했으면 `authenticate`에서 401, 로그인은 했지만 남의 글이면 `assertOwner`에서 **403**입니다. 글이 아예 없으면 404입니다.

**근거 코드**
- `authenticate` — 401 지점 — `apps/api/src/middleware/authenticate.ts:6`
- `assertOwner` — 403 지점 — `apps/api/src/modules/sources/source.service.ts:326`

---

### Q46. 댓글은 어떻게 처리하나요?

**한 줄 답** 작성은 `POST /api/sources/:id/comments`, 수정·삭제는 `PATCH`/`DELETE /api/comments/:id`입니다. 댓글 작성자 본인만 수정·삭제할 수 있습니다.

**쉽게 말하면** 작성은 "이 글에 단다"는 뜻이라 자료 주소 밑에 있고, 수정·삭제는 "이 댓글 하나"를 지목하는 것이라 댓글 주소를 쓴다. 댓글은 수가 적어서 페이징 없이 전부 내려 주고, 대화 순서대로 오래된 것부터 정렬한다.

**근거 코드**
- `listComments` — 전부 반환, 오래된 순 — `apps/api/src/modules/comments/comment.service.ts:29`
- 댓글 수정·삭제 route — `apps/api/src/modules/comments/comment.routes.ts:11`
- 댓글 작성자 확인 — `apps/api/src/modules/comments/comment.service.ts:54`

---

### Q47. 페이징은 어떻게 구현했나요?

**한 줄 답** `page`와 `limit`을 받아 DB에서 `skip`·`take`로 잘라 옵니다. 기본 12개, 최대 50개이며 목록과 총개수를 **한 트랜잭션에서 함께** 조회해 `totalItems`·`totalPages`를 내려 줍니다.

**쉽게 말하면** 자료가 1만 개라도 12개만 읽어서 보낸다. 화면에서 잘라 보여 주는 게 아니라 **서버가 애초에 조금만 읽는 것**이 핵심이다.

**근거 코드**
- `paginationQuerySchema` — 기본 12, 최대 50 — `packages/shared/src/index.ts:160`
- `listSources` — skip·take와 총개수 — `apps/api/src/modules/sources/source.service.ts:146`
**더 보기** [09c장](./09c-pagination-search-and-files.md)

---

### Q48. offset 방식의 단점은 무엇인가요?

**한 줄 답** 뒤 페이지로 갈수록 건너뛰는 비용이 커지고, 보는 도중 새 글이 추가되면 항목이 밀려 중복으로 보일 수 있습니다.

**쉽게 말하면** 1000페이지를 보려면 앞의 1만 개를 세어 건너뛰어야 한다. 규모가 커지면 "마지막으로 본 글 다음부터"를 조건으로 거는 cursor 방식으로 바꿀 수 있고, 인덱스가 이미 그 순서로 잡혀 있어 바꾸기 어렵지 않다.

**근거 코드**
- 건너뛰기 방식이 쓰인 곳 — `apps/api/src/modules/sources/source.service.ts:146`
- 정렬과 같은 순서의 인덱스 — `apps/api/prisma/schema.prisma:57`

---

### Q49. 검색은 어떻게 동작하나요?

**한 줄 답** 검색어 `q`, 태그 `tag`, 종류 `type`이 페이징과 같은 요청에 실립니다. 검색어 하나로 제목·요약·본문 미리보기·도메인 네 곳을 대소문자 구분 없이 찾습니다.

**쉽게 말하면** 검색창을 비우면 `q=`가 붙는데, 이걸 "빈 문자열로 검색"이 아니라 **"조건 없음"**으로 해석하도록 처리했다.

**근거 코드**
- `sourceListQuerySchema` — q·tag·type — `packages/shared/src/index.ts:169`
- `sourceListWhere` — 조건 조립 — `apps/api/src/modules/sources/source.service.ts:118`

---

### Q50. 선택 구현으로 무엇을 만들었나요?

**한 줄 답** 좋아요, 게시글 검색, 파일 업로드, 사용자 프로필입니다.

**쉽게 말하면** 좋아요는 사용자와 자료를 묶은 복합 키로 중복을 막았고, 파일은 자료 작성자만 올릴 수 있다.

**근거 코드**
- 좋아요 `likeSource` — `apps/api/src/modules/sources/source.service.ts:393`
- 파일 업로드 `createFile` — `apps/api/src/modules/files/file.service.ts:92`
- 프로필 수정 route — `apps/api/src/modules/users/user.routes.ts:14`

---

## H. 데이터베이스

### Q51. 테이블 관계를 어떤 기준으로 설계했나요?

**한 줄 답** 세 가지를 봤습니다. **누가 소유하는가**, **한쪽에 몇 개가 붙는가**, **부모가 사라지면 자식은 어떻게 되는가**입니다.

**쉽게 말하면** 한 사용자가 여러 자료를 쓰므로 1:N, 자료와 태그는 서로 여러 개라 N:M이다.

**근거 코드**
- 모델 전체와 관계 선언 — `apps/api/prisma/schema.prisma:10`
- `Source`의 관계와 인덱스 — `apps/api/prisma/schema.prisma:57`
**더 보기** [12장](./12-database-schema-atlas.md)

---

### Q52. 태그를 배열이 아니라 별도 테이블로 둔 이유는?

**한 줄 답** 하나의 태그로 여러 자료를 찾을 수 있어야 하고, 대소문자·공백만 다른 중복 태그를 하나로 모아야 하기 때문입니다.

**쉽게 말하면** 배열에 글자로 넣어 두면 "React"와 "react"가 다른 태그가 된다. 별도 테이블에 정규화된 이름으로 한 번만 저장하면 그런 문제가 없다.

**근거 코드**
- `Tag` 모델 — `apps/api/prisma/schema.prisma:130`
- `SourceTag` 연결 테이블 — `apps/api/prisma/schema.prisma:140`

---

### Q53. Cascade와 Restrict를 어떻게 나눴나요?

**한 줄 답** 자료가 사라지면 **의미가 함께 사라지는 것**(댓글·첨부파일·태그 연결·좋아요)은 Cascade로 같이 지우고, **기록으로 남겨야 할 관계**(사용자 삭제 시 그 사람이 쓴 자료)는 Restrict로 막았습니다.

**쉽게 말하면** 기술 문제가 아니라 제품 정책이다. "작성자를 지우면 그 글도 지워야 하나?"라는 판단이 필요하다.

**근거 코드**
- `Comment` — 자료 삭제 시 함께 삭제 — `apps/api/prisma/schema.prisma:115`
- `Source` — 작성자 삭제는 막음 — `apps/api/prisma/schema.prisma:57`

---

### Q54. 좋아요 테이블에 복합 PK를 쓴 이유는?

**한 줄 답** 사용자 ID와 자료 ID를 묶어 기본 키로 두면 **같은 사람이 같은 글에 두 번 좋아요를 누르는 것을 DB가 막아 줍니다.**

**쉽게 말하면** 코드로 확인하는 것보다 DB 제약으로 막는 편이 확실하다. 동시에 두 번 눌려도 뚫리지 않는다.

**근거 코드**
- `SourceLike` 복합 기본 키 — `apps/api/prisma/schema.prisma:85`

---

### Q55. 인덱스는 왜 걸었나요?

**한 줄 답** 자주 찾거나 정렬하는 컬럼을 빨리 찾기 위해서입니다. 자료는 `[createdAt desc, id desc]`로 걸어 목록 정렬과 순서를 맞췄습니다.

**쉽게 말하면** 책의 목차 같은 것이다. 다만 모든 컬럼에 걸면 저장할 때마다 목차도 고쳐야 해서 오히려 느려진다.

**근거 코드**
- `Source`의 인덱스 선언 — `apps/api/prisma/schema.prisma:57`
- `Comment`의 인덱스 선언 — `apps/api/prisma/schema.prisma:115`

---

### Q56. migration과 seed는 무엇이 다른가요?

**한 줄 답** migration은 **테이블 구조 변경 기록**이라 모든 환경에 필요하고, seed는 **예시 데이터 넣기**라 개발·시연용입니다.

**쉽게 말하면** 운영 DB에 seed 데이터가 없는 것은 정상이다.

**근거 코드**
- migration 기록 — `apps/api/prisma/migrations/`
- seed 스크립트 — `apps/api/prisma/seed.ts`

---
## I. 보안 꼬리 질문

### Q57. 쿠키를 쓰면 CSRF 위험이 있지 않나요? CORS 설정은 왜 없나요?

**한 줄 답** 브라우저 입장에서 Web과 API가 **같은 주소**라 CORS가 필요 없습니다. 대신 데이터를 바꾸는 요청은 `Origin` 헤더가 서비스 주소와 정확히 같을 때만 통과시켜 CSRF를 막습니다.

**쉽게 말하면** `Origin`은 브라우저가 붙이고 자바스크립트가 위조할 수 없다. 그래서 "우리 화면에서 온 요청"만 골라낼 수 있다. 쿠키의 `sameSite` 설정과 함께 두 겹이다.

**근거 코드**
- `verifyOrigin` — `apps/api/src/middleware/origin.ts:8`
- 쿠키의 `sameSite` 설정 — `apps/api/src/modules/auth/auth.routes.ts:22`
**더 보기** [05장](./05-backend-and-api.md)

---

### Q58. 비밀번호를 계속 시도하는 공격은 어떻게 막았나요?

**한 줄 답** 경로마다 요청 횟수를 제한했습니다. 가입은 1시간에 5회, 인증 메일 재전송은 1시간에 3회, 로그인은 15분에 10회입니다.

**쉽게 말하면** 메일 발송처럼 비용이 드는 작업일수록 촘촘하게 잡았다.

**근거 코드**
- `createRateLimit` — `apps/api/src/middleware/rate-limit.ts:3`
- 가입 5회/시간이 걸리는 곳 — `apps/api/src/modules/auth/auth.routes.ts:58`

---

### Q59. 파일 업로드는 어떻게 검증했나요?

**한 줄 답** 확장자와 MIME 타입이 **짝이 맞는지** 함께 확인하고(415), 10MB를 넘으면 거절하며(413), 자료 작성자만 올릴 수 있습니다.

**쉽게 말하면** 저장할 때는 원래 파일명 대신 무작위 ID로 새 이름을 만든다. 같은 이름끼리 덮어쓰거나, 파일명에 섞인 경로 문자로 엉뚱한 폴더에 쓰이는 것을 막기 위해서다. 원래 이름은 DB에 따로 두고 다운로드할 때 되돌려 준다.

**근거 코드**
- `validateUpload` — 확장자·MIME·크기 — `apps/api/src/modules/files/file.service.ts:51`
- 스트림 단계 상한 — `apps/api/src/modules/files/multipart.ts:5`

---

## J. API 문서·Docker·배포·테스트

### Q60. Swagger 문서는 어떻게 만들었나요?

**한 줄 답** 손으로 쓰지 않았습니다. `packages/shared`의 Zod schema에서 자동으로 생성해 `/api/docs`에서 보여 줍니다.

**쉽게 말하면** 입력 규칙을 한 곳만 고치면 **화면·API·문서가 함께 바뀐다.** 문서만 옛날 내용으로 남는 일이 구조적으로 생기지 않는다.

**근거 코드**
- Zod schema를 문서로 바꾸는 곳 — `apps/api/src/openapi/document.ts:32`
- `/api/openapi.json`과 `/api/docs` — `apps/api/src/openapi/openapi.routes.ts:8`
**더 보기** [11장](./11-api-contract-atlas.md)

---

### Q61. Docker를 왜 사용했나요?

**한 줄 답** 내 컴퓨터, CI 서버, 운영 서버에서 **같은 실행 환경**을 재현하기 위해서입니다.

**쉽게 말하면** "제 컴퓨터에서는 되는데요"를 없애는 것이다. 프로그램과 필요한 환경을 통째로 상자에 담아 옮긴다.

**근거 코드**
- API 이미지 — `apps/api/Dockerfile`
- Web 이미지 — `apps/web/Dockerfile`

---

### Q62. Docker Compose는 무엇을 해결하나요?

**한 줄 답** 여러 컨테이너의 **관계와 설정을 한 파일에 선언**합니다. 이 프로젝트는 `web`, `api`, `db`, `mailpit`, `caddy` 다섯 개입니다.

**쉽게 말하면** 컨테이너끼리는 서비스 이름(`db`, `api`)으로 서로를 부른다. 준비가 끝났는지 확인하는 health check와, 데이터를 컨테이너 밖에 보관하는 볼륨도 함께 적어 둔다.

**근거 코드**
- 서비스 다섯 개 선언 — `compose.yaml`
- api 서비스와 health check — `compose.yaml:33`
**더 보기** [13장](./13-docker-and-local-environment.md)

---

### Q63. Caddy는 왜 필요한가요?

**한 줄 답** Web은 3000번, API는 4000번 포트인데 사용자는 **주소 하나만** 쓰게 하기 위해서입니다. `/api/*`는 API로, 나머지는 Web으로 넘깁니다.

**쉽게 말하면** 덕분에 브라우저 입장에서 같은 출처가 유지돼 쿠키와 CORS가 단순해지고, 내부 포트를 밖에 열지 않아도 된다. HTTPS 인증서도 자동으로 관리한다.

**근거 코드**
- `/api/*`를 API로 넘기는 규칙 — `infra/Caddyfile:4`
- 운영용 HTTPS 설정 — `infra/Caddyfile.production`

---

### Q64. 배포는 어떤 순서로 이루어지나요?

**한 줄 답** main에 올라간 코드가 CI를 통과하면 → Web·API 이미지를 만들어 GHCR에 올리고 → 서버에 SSH로 접속해 이미지를 받아 → DB migration을 적용하고 → Compose로 실행합니다. 마지막에 HTTPS로 잘 뜨는지 확인합니다.

**쉽게 말하면** 서버에서 소스를 직접 빌드하지 않는다. **완성된 이미지를 가져다 실행만** 한다. 이미지에 커밋 번호가 붙어 있어 문제가 생기면 이전 버전으로 되돌리기 쉽다.

**근거 코드**
- 이미지 build·push — `.github/workflows/deploy.yml:48`
- 서버 접속 후 배포 — `.github/workflows/deploy.yml:82`
**더 보기** [17장](./17-cloud-deployment-and-operations.md)

---

### Q65. 어디에 배포했나요?

**한 줄 답** Azure VM입니다. DB는 VM 안이 아니라 **VM 밖의 관리형 PostgreSQL**을 씁니다.

**쉽게 말하면** DB를 분리하면 VM을 다시 만들어도 데이터가 그대로 남는다. 참고로 배포 스크립트의 설정 이름이 `EC2_HOST` 같은 형태인데, **이름만 그렇고 실제 대상은 Azure VM**이다. SSH로 접속하는 리눅스 서버라면 클라우드 종류와 무관하게 동작한다.

**근거 코드**
- SSH 접속 대상 설정 — `.github/workflows/deploy.yml:82`
- 관리형 DB로 바꾸는 덧씌우기 — `compose.azure.yaml`

---

### Q66. 개발·CI·운영 환경은 무엇이 다른가요?

**한 줄 답** 코드는 같고 **의존 서비스와 비밀값이** 다릅니다. 개발은 Docker PostgreSQL과 Mailpit, 운영은 관리형 PostgreSQL과 실제 SMTP를 씁니다.

**쉽게 말하면** 그래서 운영에서 Mailpit 화면을 찾으면 안 된다. 메일이 실제 받은편지함으로 간다.

**근거 코드**
- 개발용 메일 도구 — `compose.yaml:4`
- 운영용 설정 — `compose.production.yaml`

---

### Q67. 어떤 테스트를 작성했나요?

**한 줄 답** 백엔드는 단위·통합 테스트가 10개 파일 이상 있고(가입→인증→로그인, 자료 권한 등), 브라우저 E2E는 Playwright로 CRUD 흐름 하나가 있습니다. 프론트엔드 단위 테스트는 `apiFetch`와 상태 표시 두 개뿐입니다.

**쉽게 말하면** 프론트 테스트가 적은 것은 사실이라 그대로 말한다. 대신 CI가 lint·타입 검사·빌드·컨테이너 기동 확인까지 매번 돌린다.

**근거 코드**
- CI가 검사하는 것 — `.github/workflows/ci.yml:13`
- 브라우저 E2E — `e2e/core-crud.spec.ts`

---

## 정직하게 답해야 하는 것

과장하면 꼬리 질문에서 무너진다. 아래는 **사실대로 말하고 대신 이유를 덧붙인다.**

| 질문받으면 | 이렇게 답한다 |
| --- | --- |
| AI 요약 기능 | "현재 운영에서는 `demo` 모드입니다. 실제 모델 연동은 서버 자원과 응답 시간 문제로 다음 과제로 남겨 뒀습니다." |
| 라우트 보호 | "Next.js middleware는 쓰지 않았습니다. 화면 이동은 클라이언트에서 처리하고 실제 보안은 API가 담당합니다. middleware를 넣으면 화면 깜빡임을 줄일 수 있어 개선 여지로 남아 있습니다." |
| 프론트엔드 테스트 | "두 개뿐입니다. 백엔드 통합 테스트와 E2E로 흐름은 덮었지만 컴포넌트 단위 테스트는 부족합니다." |
| 배포 대상 | "Azure VM입니다. 스크립트의 설정 이름이 EC2로 남아 있는 것은 초기 작명 그대로입니다." |
| 페이징 | "offset 방식입니다. 지금 규모에서는 충분하지만 데이터가 많아지면 cursor 방식으로 바꿔야 합니다." |

---

## 자가 점검

한 번 훑은 뒤 표시한다. **못 함**에 표시된 묶음이 다음에 공부할 순서다.

| 묶음 | 번호 | 답할 수 있음 | 애매함 | 못 함 |
| --- | --- | --- | --- | --- |
| A. 전체 구조 | Q1–Q7 | | | |
| B. 화면 상태 관리 | Q8–Q13 | | | |
| C. 렌더링 | Q14–Q16 | | | |
| D. API 연동과 에러 | Q17–Q24 | | | |
| E. 로그인과 인증 | Q25–Q35 | | | |
| F. 회원가입과 메일 | Q36–Q40 | | | |
| G. 게시판·댓글·페이징 | Q41–Q50 | | | |
| H. 데이터베이스 | Q51–Q56 | | | |
| I. 보안 | Q57–Q59 | | | |
| J. 문서·Docker·배포·테스트 | Q60–Q67 | | | |

답하지 못한 질문은 [21장](./21-final-socratic-checklist.md)의 "코드 근거 찾기" 표를 보고 해당 파일을 직접 열어 확인한다.

---

처음으로 → [01. 서비스와 전체 요청](./01-service-and-request.md)
