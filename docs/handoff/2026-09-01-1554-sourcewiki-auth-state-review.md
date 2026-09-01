# Handoff: SourceWiki 인증·상태관리 복습

- ID: 2026-09-01-1554-sourcewiki-auth-state-review
- 상태: 부분 완료
- 기록 시각: 2026-09-01 15:54 KST
- 관련 Socratic: [2026-09-01-1554-sourcewiki-auth-state-review](../socratic/2026-09-01-1554-sourcewiki-auth-state-review.md)

## 목표와 결과

- 목표: 이전에 학습한 인증과 상태관리 내용을 평가 질문에 답할 수 있는 수준으로 다시 연결하고, 다음 복습 지점을 남긴다.
- 결과: `POST /api/auth/login`은 기존 cookie가 없어도 이메일·비밀번호·`emailVerifiedAt`을 확인한 뒤 새 access/refresh cookie를 발급하는 과정임을 복습했다. `useMeQuery`는 프로젝트가 만든 custom Hook이고 내부에서 TanStack Query의 `useQuery`를 사용하며, `authApi.me()`를 통해 `GET /api/auth/me`를 호출한다는 점을 확인했다. 로그인 상태의 근거인 token은 HttpOnly cookie에, 현재 사용자 정보는 `['auth', 'me']` Query cache에 보관된다는 점을 구분했다. access token 만료 시 401 → refresh → token rotation → 원래 요청 재시도 흐름도 다시 정리했다.
- 현재 복습 상태: 전체 구조와 인증 흐름은 설명할 수 있다. 평가 질문 5개를 처음부터 끝까지 독립적으로 답하는 연습과 API·에러 처리 복습은 아직 남아 있다.

## 변경 사항

- 소스 코드에는 기능 변경을 하지 않았다.
- `docs/goal/current.md`: 오늘 복습 결과와 다음 재개 지점을 최신 체크포인트로 갱신했다.
- `docs/handoff/2026-09-01-1554-sourcewiki-auth-state-review.md`: 오늘 복습한 개념과 내일 재개 순서를 기록했다.
- `docs/socratic/2026-09-01-1554-sourcewiki-auth-state-review.md`: 복습 중 확인된 구분과 미확인 항목을 기록했다.

## 검증 증거

- `nl -ba apps/api/src/app.ts | sed -n '40,52p'` → `/api/auth`를 auth Router에 연결하는 구조를 확인했다.
- `nl -ba apps/api/src/modules/auth/auth.routes.ts | sed -n '56,113p'` → `/signup`, `/verify-email`, `/login`, `/refresh`, `/logout`, `/me` Route와 Service 호출·cookie 처리를 확인했다.
- `nl -ba apps/api/src/modules/auth/auth.service.ts | sed -n '35,100p;111,156p'` → 회원가입·이메일 인증·로그인에서 token과 사용자 상태를 처리하는 흐름을 확인했다.
- `nl -ba apps/api/src/lib/jwt.ts | sed -n '19,49p'` 및 `nl -ba apps/api/src/middleware/authenticate.ts | sed -n '6,15p'` → JWT 검증과 `access_token` cookie 검증 위치를 확인했다.
- `nl -ba apps/web/src/features/auth/auth-api.ts | sed -n '10,42p'` → `authApi.me()`가 `apiFetch('/api/auth/me')`를 호출함을 확인했다.
- `nl -ba apps/web/src/features/auth/use-me-query.ts | sed -n '8,21p'` → `useMeQuery`가 `useQuery`, `['auth', 'me']`, `authApi.me()`를 조합한 custom Hook임을 확인했다.
- `nl -ba apps/web/src/lib/api/api-client.ts | sed -n '39,77p'` → 401 발생 시 refresh 후 원래 요청을 재시도하는 공통 처리를 확인했다.
- `nl -ba apps/web/src/lib/query/query-provider.tsx | sed -n '1,40p'`, `nl -ba apps/web/src/features/sources/source-list.tsx | sed -n '181,187p'`, `nl -ba apps/web/src/features/sources/source-form.tsx | sed -n '115,148p'` → QueryProvider, 목록 조회 `useQuery`, 생성·수정 `useMutation`, `invalidateQueries`의 실제 위치를 확인했다.
- 작업 시작 시 `git status --short` → 기존 사용자 변경으로 `docs/learning_data/requirement-q.md`가 수정 상태임을 확인했으며, 해당 파일은 건드리지 않았다.

## 미검증 및 차단 요인

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`는 실행하지 않았다.
- 실제 브라우저에서 cookie·`/me`·401·refresh 요청이 발생하는 장면은 확인하지 않았다.
- `requirement-q.md`의 로그인 관련 5개 예상 질문에 대한 독립적인 발표 답변은 아직 완성하지 않았다.
- 차단 요인은 없다.

## 다음 세션 재개 순서

1. “로그인 상태는 어디에 저장했나요?” 질문에 token cookie와 사용자 정보 Query cache를 구분해 답한다.
2. “페이지 새로고침”, “인증 페이지 접근 제어”, “토큰 만료” 질문을 각각 `useMeQuery`, Frontend redirect, `apiFetch` refresh 흐름과 연결해 답한다.
3. `apps/web/src/lib/api/api-client.ts`의 `ApiError`, timeout, fieldErrors, 401 처리로 API·에러 질문을 복습한다.
4. `useQuery`·`useMutation`·`invalidateQueries`·`setQueryData`를 자료 목록·자료 저장 예시와 연결한다.
5. `docs/learning_data/requirement-q.md`의 질문을 실제 코드 경로를 포함한 30초 발표 답변으로 정리한다.
