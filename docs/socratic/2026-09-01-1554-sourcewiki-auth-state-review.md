# Socratic: SourceWiki 인증·상태관리 복습

- ID: 2026-09-01-1554-sourcewiki-auth-state-review
- 상태: 부분 완료
- 관련 Handoff: [2026-09-01-1554-sourcewiki-auth-state-review](../handoff/2026-09-01-1554-sourcewiki-auth-state-review.md)

## 질문과 확인된 사실

| 질문 | 답 | 상태 | 근거 |
| --- | --- | --- | --- |
| 로그인 요청은 기존 cookie가 있어야 하는가? | 아니다. `/api/auth/login`은 이메일·비밀번호와 이메일 인증 상태를 확인한 뒤 성공하면 cookie를 발급한다. | 확인됨 | `apps/api/src/modules/auth/auth.routes.ts:89-93`, `apps/api/src/modules/auth/auth.service.ts:148-156` |
| `authApi.me()`는 무엇을 호출하는가? | `apiFetch`로 `/api/auth/me`를 호출하는 Frontend API wrapper다. | 확인됨 | `apps/web/src/features/auth/auth-api.ts:17` |
| `useMeQuery`는 TanStack Query의 기본 Hook인가? | 아니다. 프로젝트가 만든 custom Hook이며, 내부에서 TanStack Query의 `useQuery`를 호출한다. | 확인됨 | `apps/web/src/features/auth/use-me-query.ts:8-20` |
| `['auth', 'me']`는 token이나 인증 비밀값인가? | 아니다. 현재 사용자 조회 결과를 저장·공유하기 위한 Query cache의 이름표다. | 확인됨 | `apps/web/src/features/auth/use-me-query.ts:9-13` |
| `/api/auth/me`는 무엇을 확인하는가? | Frontend가 token 원문을 읽는 것이 아니라, Backend `authenticate`가 cookie의 access token을 검증하고 Service가 사용자 정보를 조회한다. | 확인됨 | `apps/api/src/middleware/authenticate.ts:6-12`, `apps/api/src/modules/auth/auth.routes.ts:110-112` |
| 로그인 상태는 어디에 저장하는가? | access/refresh token은 HttpOnly cookie, 현재 사용자 정보는 `['auth', 'me']` Query cache에 둔다. | 확인됨 | `apps/api/src/modules/auth/auth.routes.ts:20-34`, `apps/web/src/features/auth/use-me-query.ts:9-19` |
| access token이 만료되면 어떻게 하는가? | `apiFetch`가 401을 감지해 refresh endpoint를 호출하고, 새 cookie를 받은 뒤 원래 요청을 한 번 재시도한다. | 확인됨 | `apps/web/src/lib/api/api-client.ts:67-77`, `apps/api/src/modules/auth/auth.routes.ts:94-103` |
| 오늘 평가 질문 5개에 독립적으로 답할 수 있는가? | 각 답의 핵심 개념은 학습했지만, 다섯 답변을 발표 형식으로 연속해서 말하는 연습은 아직이다. | 미확인 | 다음 복습 계획 |

## 판단

- 확인됨:
  - 학습자는 `app.ts`의 Router mounting, `auth.routes.ts`의 handler, `auth.service.ts`의 업무 처리를 구분했다.
  - 회원가입·이메일 인증·로그인·`/me`의 역할을 서로 다른 요청으로 구분했다.
  - `useMeQuery`가 인증 자체가 아니라 `/me` 결과를 Frontend에서 관리하는 custom Hook이라는 점을 이해했다.
  - token cookie와 Query cache의 저장 대상을 구분했다.
- 추론:
  - 다음 복습은 개념을 새로 추가하기보다 평가 질문의 문장에 실제 코드 경로를 붙이는 방식이 효과적이다.
  - `useQuery`와 `useMutation`은 자료 목록 조회·저장 사례로 다시 보면 더 쉽게 정착될 가능성이 높다.
- 미확인:
  - 실제 실행 환경의 cookie·401·refresh 동작.
  - TanStack Query 상태관리와 API·에러 처리 예상 질문에 대한 독립 답변.

## 다음 계획

1. 로그인 상태 저장 위치를 답한다 — 근거/의존성: HttpOnly cookie와 `['auth', 'me']` — 확인 방법: token과 사용자 정보의 저장 위치를 한 문장으로 구분한다.
2. 새로고침·접근 제어·token 만료를 답한다 — 근거/의존성: `useMeQuery`, `authenticate`, `apiFetch` — 확인 방법: 각 질문에 호출 API와 실패 조건을 포함한다.
3. 공통 API·에러 처리를 복습한다 — 근거/의존성: `api-client.ts` — 확인 방법: `ApiError`, timeout, fieldErrors, refresh를 순서대로 설명한다.
4. 최종 예상 질문 연습을 한다 — 근거/의존성: `docs/learning_data/requirement-q.md` — 확인 방법: 각 답변에 실제 코드 경로와 선택 이유를 포함한다.

## 중단 또는 방향 전환 조건

- 실제 코드와 학습 문서의 설명이 다르면 코드와 실행 결과를 우선하고 차이를 기록한다.
- 학습자가 다섯 질문을 독립적으로 설명하면 반복 복습을 줄이고 CRUD·DB 관계 또는 발표 모의 면접으로 이동한다.
