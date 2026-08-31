# Socratic: SourceWiki 인증·상태관리 학습

- ID: 2026-08-31-1652-sourcewiki-auth-state-learning
- 상태: 부분 완료
- 관련 Handoff: [2026-08-31-1652-sourcewiki-auth-state-learning](../handoff/2026-08-31-1652-sourcewiki-auth-state-learning.md)

## 질문과 확인된 사실

| 질문 | 답 | 상태 | 근거 |
| --- | --- | --- | --- |
| 회원가입 요청은 어떤 경로로 처리되는가? | Frontend의 `authApi.signup()`이 `POST /api/auth/signup`을 호출하고, `app.ts`가 auth Router로 연결한 뒤 Route가 Service를 호출한다. | 확인됨 | `apps/web/src/features/auth/auth-api.ts:18-23`, `apps/api/src/app.ts:42-49`, `apps/api/src/modules/auth/auth.routes.ts:56-64` |
| 회원가입 Service는 무엇을 하는가? | 비밀번호를 bcrypt hash로 바꾸고 User를 저장한 뒤 인증 token hash와 만료 시각을 DB에 저장하고 메일을 보낸다. | 확인됨 | `apps/api/src/modules/auth/auth.service.ts:35-100` |
| 이메일 인증은 언제 token을 만들고 무엇을 갱신하는가? | token은 회원가입 때 만들며, `/api/auth/verify-email`에서는 전달받은 token을 검증한다. 성공 시 token의 `usedAt`과 User의 `emailVerifiedAt`을 현재 시각으로 기록한다. | 확인됨 | `apps/api/src/modules/auth/auth.service.ts:35-56,111-131` |
| 로그인은 기존 cookie가 있어야 가능한가? | 아니다. 로그인 Route는 기존 access token을 요구하지 않고, 이메일·비밀번호와 `emailVerifiedAt`을 확인한 뒤 성공하면 cookie를 발급한다. | 확인됨 | `apps/api/src/modules/auth/auth.routes.ts:89-93`, `apps/api/src/modules/auth/auth.service.ts:148-156` |
| access/refresh token을 왜 나누는가? | access token을 짧게 유지해 노출 피해 시간을 줄이면서 refresh token으로 재로그인 없이 세션을 이어가기 위해서다. | 확인됨 | `apps/api/src/lib/jwt.ts:24-32`, `apps/api/src/modules/auth/auth.service.ts:133-146` |
| HttpOnly cookie는 무엇인가? | cookie 값이 아니라 JavaScript가 읽지 못하게 하는 설정이며, 브라우저는 요청에 자동으로 전송한다. | 확인됨 | `apps/api/src/modules/auth/auth.routes.ts:20-34`, `apps/web/src/lib/api/api-client.ts:57-65` |
| access token 만료 뒤 어떤 일이 일어나는가? | `apiFetch`가 401을 감지해 refresh endpoint를 호출하고, 새 cookie를 받은 뒤 원래 요청을 한 번 재시도한다. refresh 실패 시 인증 오류로 남는다. | 확인됨 | `apps/web/src/lib/api/api-client.ts:39-77`, `apps/api/src/modules/auth/auth.routes.ts:94-103` |
| `useMeQuery`는 무엇인가? | API 자체가 아니라 `authApi.me()`를 통해 `GET /api/auth/me`를 호출하고 `['auth', 'me']` Query cache로 사용자 상태를 제공하는 Frontend Hook이다. | 확인됨 | `apps/web/src/features/auth/use-me-query.ts:8-20`, `apps/web/src/features/auth/auth-api.ts:17` |
| TanStack Query만 Backend 데이터를 저장할 수 있는가? | 아니다. `useState`, Context, Zustand, Redux, SWR 등도 데이터를 보관할 수 있다. 다만 TanStack Query는 서버 데이터의 fetch·cache·loading/error·재검증·mutation 연계를 목적에 맞게 제공한다. | 확인됨 | `apps/web/src/lib/query/query-provider.tsx:3-16`, `docs/learning_data/03-frontend-state-and-data-flow.md` |
| 오늘 상태관리 이해가 말로 검증되었는가? | TanStack Query가 서버 상태용이고 `useState`/React Hook Form이 화면·폼 상태용이라는 설명은 진행했지만, 별도의 재답변 점검은 남아 있다. | 미확인 | 다음 세션 이해 점검 |

## 판단

- 확인됨:
  - 학습자는 API endpoint와 `app.ts`의 Router mounting을 구분하고, Route가 Service를 호출한다는 구조를 자신의 말로 정리했다.
  - 이메일 인증 성공 시 “인증 여부 boolean”이 아니라 `emailVerifiedAt`과 token `usedAt`이라는 시간 기록이 갱신된다는 점을 이해했다.
  - access token 만료 시 Frontend가 바로 로그아웃되는 것이 아니라 refresh를 시도하며, refresh 실패 때만 비로그인 상태가 된다는 점을 이해했다.
  - 새로고침 후 로그인 상태는 `useMeQuery` 자체가 아니라 그 Hook이 호출하는 `GET /api/auth/me`의 결과로 복구된다는 점을 확인했다.
- 추론:
  - 다음 학습은 상태관리 도구 이름을 더 늘리기보다 서버 상태·화면 상태 분류와 실제 Query cache 갱신 흐름을 연습하는 것이 평가 대비에 효과적이다.
  - `requirement-q.md`의 예상 질문은 전체 학습 후 암기하는 목록이 아니라, 각 개념을 코드 근거와 연결하는 점검표로 사용하는 것이 적합하다.
- 미확인:
  - 실제 실행 환경에서 cookie, 401, refresh rotation, `/me` 요청이 발생하는 장면.
  - TanStack Query 상태관리 예상 질문에 대한 학습자의 독립적인 답변.

## 다음 계획

1. 서버 상태와 화면 상태를 분류한다 — 근거/의존성: `useMeQuery`, `useState`, React Hook Form — 확인 방법: 사용자·자료 목록·모달·폼 입력을 각각 도구에 배정한다.
2. Query lifecycle을 설명한다 — 근거/의존성: `QueryProvider`, `useQuery`, `useMutation` — 확인 방법: 목록 조회, 자료 생성, `invalidateQueries`, `setQueryData`의 순서를 말한다.
3. API·에러 처리 질문을 연결한다 — 근거/의존성: `api-client.ts` — 확인 방법: `ApiError`, timeout, fieldErrors, 401 refresh의 발표 답변을 작성한다.

## 중단 또는 방향 전환 조건

- 실제 코드와 기존 학습 문서의 설명이 다르면 코드·실행 결과를 우선하고 차이를 기록한다.
- 학습자가 상태관리 개념을 이미 충분히 설명하면 반복을 줄이고 `requirement-q.md` 기반 모의 질문으로 이동한다.
