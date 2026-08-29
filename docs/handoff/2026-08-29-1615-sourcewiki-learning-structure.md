# Handoff: SourceWiki 발표 대비 구조 학습

- ID: 2026-08-29-1615-sourcewiki-learning-structure
- 상태: 부분 완료
- 기록 시각: 2026-08-29 16:15 KST
- 관련 Socratic: [2026-08-29-1615-sourcewiki-learning-structure](../socratic/2026-08-29-1615-sourcewiki-learning-structure.md)

## 목표와 결과

- 목표: 요구사항 기준서를 바탕으로 SourceWiki의 폴더 역할과 요청 처리 구조를 초보자도 설명할 수 있게 학습한다.
- 결과: 모노레포의 주요 영역, Web/API/Shared/인프라의 역할, 기능별 Router 분배, Route와 Service 분리, 자료 작성자 권한 검사의 위치를 확인했다. 다음 학습 주제는 인증 흐름이다.

## 변경 사항

- `docs/goal/current.md`: 현재 학습 목표·범위·완료 상태·다음 재개 지점을 기록했다.
- `docs/handoff/2026-08-29-1615-sourcewiki-learning-structure.md`: 이번 세션의 학습 결과와 재개 절차를 기록했다.
- `docs/socratic/2026-08-29-1615-sourcewiki-learning-structure.md`: 확인된 사실, 추론, 미확인 항목을 근거와 함께 기록했다.
- 소스 코드에는 기능 변경을 하지 않았다. 아래 경로들은 구조 설명을 위한 읽기 근거로 확인했다.

## 검증 증거

- `rg --files --hidden -g '!.git/**'` → `apps/web`, `apps/api`, `packages/shared`, `infra`, `.github/workflows`, `e2e`, `docs` 등의 실제 구조를 확인했다.
- `nl -ba apps/api/src/app.ts | sed -n '35,55p'` → `/api/auth`, `/api/sources`, `/api/comments`, `/api/files`, `/api/users`를 기능별 Router에 연결하는 것을 확인했다.
- `nl -ba apps/api/src/modules/auth/auth.routes.ts | sed -n '42,115p'` → 회원가입·이메일 인증·로그인·refresh·logout·내 정보 API가 `auth.routes.ts`에 있음을 확인했다.
- `nl -ba apps/api/src/modules/sources/source.routes.ts | sed -n '120,155p'` → 자료 생성·수정·삭제 Route가 middleware 통과 후 Service를 호출함을 확인했다.
- `nl -ba apps/api/src/modules/sources/source.service.ts | sed -n '326,378p'` → `assertOwner`가 작성자 ID를 확인하고, 수정·삭제 함수가 이를 호출함을 확인했다.
- `nl -ba apps/api/src/middleware/authenticate.ts | sed -n '6,16p'` → `access_token` 쿠키를 검증하고 `res.locals.auth.userId`를 설정함을 확인했다.
- `sed -n '1,160p' apps/web/src/lib/api/server-api.ts` 및 `apps/web/src/lib/api/api-client.ts` → 서버에서 호출하는 API와 브라우저에서 호출하는 공통 API 래퍼가 분리되어 있음을 확인했다.

## 미검증 및 차단 요인

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`는 이번 세션에 실행하지 않았다.
- 실제 서버를 띄워 브라우저 요청을 관찰하지 않았다.
- JWT claim, refresh token 회전, 이메일 인증 토큰 저장 방식은 다음 세션에서 코드로 확인해야 한다.
- 차단 요인은 없다.

## 다음 세션 재개 순서

1. [현재 목표](../goal/current.md)와 이 handoff·Socratic 기록을 먼저 읽는다.
2. `apps/api/src/modules/auth/auth.routes.ts`의 `/signup`, `/verify-email`, `/login`, `/me` Route를 확인한다.
3. `apps/api/src/modules/auth/auth.service.ts`에서 사용자 저장, 비밀번호 hash, 인증 토큰, 로그인 검증 과정을 추적한다.
4. `apps/web/src/features/auth/auth-api.ts`, `signup-form.tsx`, `login-form.tsx`에서 화면 입력이 API로 가는 경로를 연결한다.
5. 회원가입 → 이메일 인증 → 로그인 → `/me` 상태 복구를 쉬운 비유와 발표용 30초 답변으로 정리한다.
6. “로그인하지 않은 사용자는 어느 단계에서 막히는가?”, “비밀번호를 DB에 그대로 저장하지 않는 이유는?”, “새로고침 후 로그인 상태는 어떻게 복구되는가?”를 이해 점검한다.
