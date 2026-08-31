# Handoff: SourceWiki 인증·상태관리 학습

- ID: 2026-08-31-1652-sourcewiki-auth-state-learning
- 상태: 부분 완료
- 기록 시각: 2026-08-31 16:52 KST
- 관련 Socratic: [2026-08-31-1652-sourcewiki-auth-state-learning](../socratic/2026-08-31-1652-sourcewiki-auth-state-learning.md)

## 목표와 결과

- 목표: 이전에 학습한 요청 처리 구조를 회원가입·이메일 인증·로그인·세션 유지·Frontend 상태관리 흐름에 연결하고, 내일 이어서 학습할 수 있는 정확한 지점을 남긴다.
- 결과: 회원가입 요청의 `Frontend → api-client → /api/auth → auth.routes.ts → auth.service.ts → DB·메일 → 응답` 흐름을 이해했다. 이메일 인증은 가입 시 token을 만들고, 인증 요청 시 token을 검증한 뒤 `usedAt`과 `emailVerifiedAt`을 기록하는 과정임을 정리했다. 로그인에서는 이메일·비밀번호·이메일 인증 상태를 확인한 뒤 15분 access token과 14일 refresh token을 HttpOnly cookie로 발급하는 구조를 학습했다. access token 만료 시 refresh와 rotation을 거쳐 원래 요청을 재시도하고, 새로고침 후 `useMeQuery → authApi.me() → GET /api/auth/me`로 사용자 상태를 복구하는 흐름까지 연결했다.
- 추가 결과: TanStack Query는 모든 상태를 저장하는 Store가 아니라 서버 상태용 캐시·요청 관리자이며, 화면 상태는 `useState`, 폼 상태는 React Hook Form으로 분리한다는 기준을 학습했다.

## 변경 사항

- 소스 코드에는 기능 변경을 하지 않았다.
- `docs/goal/current.md`: 오늘 학습한 인증·세션·상태관리 범위와 내일 재개 지점을 최신 체크포인트로 갱신했다.
- `docs/handoff/2026-08-31-1652-sourcewiki-auth-state-learning.md`: 오늘의 학습 결과와 미완료 학습을 기록했다.
- `docs/socratic/2026-08-31-1652-sourcewiki-auth-state-learning.md`: 코드 근거와 대화 중 확인된 이해 수준을 기록했다.

## 검증 증거

- `nl -ba apps/api/src/app.ts | sed -n '40,52p'` → `/api/auth`를 auth Router에 연결하고 `/api/sources`, `/api/comments`, `/api/files`, `/api/users` 등 기능별 Router를 등록함을 확인했다.
- `nl -ba apps/api/src/modules/auth/auth.routes.ts | sed -n '56,113p'` → `/signup`, `/verify-email`, `/login`, `/refresh`, `/logout`, `/me` Route의 validation·Service 호출·cookie 응답 흐름을 확인했다.
- `nl -ba apps/api/src/modules/auth/auth.service.ts | sed -n '35,100p;111,156p'` → 인증 token 발급, 비밀번호 bcrypt hash, 미인증 User 저장, `usedAt`·`emailVerifiedAt` 갱신, 로그인 전 이메일 인증 확인을 확인했다.
- `nl -ba apps/api/src/lib/jwt.ts | sed -n '19,49p'` 및 `nl -ba apps/api/src/middleware/authenticate.ts | sed -n '6,15p'` → JWT의 `sub`, `type`, `jti`, 발급·만료 정보와 access cookie 검증 후 `userId`를 설정하는 흐름을 확인했다.
- `nl -ba apps/web/src/features/auth/auth-api.ts | sed -n '10,42p'` → Frontend auth API가 `/api/auth/*` 주소를 호출함을 확인했다.
- `nl -ba apps/web/src/features/auth/use-me-query.ts | sed -n '8,21p'` → `useMeQuery`가 `authApi.me()`를 호출하고 `['auth', 'me']` Query key로 사용자 상태를 관리함을 확인했다.
- `nl -ba apps/web/src/lib/api/api-client.ts | sed -n '39,77p'` → 401 발생 시 `/api/auth/refresh`를 호출하고 원래 요청을 한 번 재시도하는 공통 처리를 확인했다.
- `nl -ba apps/web/src/lib/query/query-provider.tsx | sed -n '1,80p'` 및 `rg -n "useState|useMutation|invalidateQueries|setQueryData" apps/web/src/features apps/web/src/app/sources/page.tsx apps/web/src/app/sources/\[id\]/page.tsx` → QueryProvider, Query cache 갱신·무효화, `useState`의 실제 사용 위치를 확인했다.
- `nl -ba docs/learning_data/requirement-q.md | sed -n '190,230p'` → JWT, DB 관계, 상태관리, API·에러·로그인·메일 인증 관련 평가 예상 질문을 확인했다.

## 미검증 및 차단 요인

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`는 실행하지 않았다.
- 실제 브라우저에서 로그인·인증 메일·access 만료·refresh 요청을 관찰하지 않았다.
- TanStack Query와 `useState`/React Hook Form의 구분은 설명했지만, 학습자가 상태 분류 문제를 자신의 말로 다시 답하는 점검은 내일 진행한다.
- 차단 요인은 없다.

## 다음 세션 재개 순서

1. TanStack Query 이해 점검: 서버 상태와 화면 상태를 나누고, `useQuery`, `useMutation`, `invalidateQueries`, `setQueryData`의 역할을 자신의 말로 설명한다.
2. `apps/web/src/lib/api/api-client.ts`의 공통 API 처리로 이동해 JSON·timeout·`ApiError`·field error·401 refresh 흐름을 연결한다.
3. `docs/learning_data/requirement-q.md`의 Frontend 예상 질문에 실제 코드 경로를 붙여 30초 답변을 만든다.
4. 이후 DB 관계와 전체 요청 흐름을 포함한 통합 발표 연습으로 넘어간다.
