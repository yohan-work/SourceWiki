# Socratic: SourceWiki 발표 대비 구조 학습

- ID: 2026-08-29-1615-sourcewiki-learning-structure
- 상태: 부분 완료
- 관련 Handoff: [2026-08-29-1615-sourcewiki-learning-structure](../handoff/2026-08-29-1615-sourcewiki-learning-structure.md)

## 질문과 확인된 사실

| 질문 | 답 | 상태 | 근거 |
| --- | --- | --- | --- |
| 이 과제의 중심 평가는 무엇인가? | Frontend 구현 완성도와 Frontend에서 Backend·DB까지 이어지는 전체 흐름의 이해다. | 확인됨 | `docs/learning_data/requirement-q.md`의 5~11, 190~195행 |
| `apps/web`의 역할은 무엇인가? | 화면을 제공하고, 기능별 API 함수와 공통 API 래퍼를 통해 Backend에 요청한다. | 확인됨 | `apps/web/src/app`, `apps/web/src/features`, `apps/web/src/lib/api` |
| `apps/api`의 역할은 무엇인가? | HTTP 요청을 받아 인증·검증·비즈니스 로직을 처리하고 Database 결과를 JSON으로 응답한다. | 확인됨 | `apps/api/src/app.ts`, `apps/api/src/modules` |
| 모든 API 요청이 `source.routes.ts`로 가는가? | 아니다. `app.ts`가 URL prefix에 따라 `auth`, `source`, `comment`, `user`, `file` Router를 선택한다. | 확인됨 | `apps/api/src/app.ts:42-49` |
| 회원가입과 로그인은 어디서 처리하는가? | `/api/auth/*` 요청은 `auth.routes.ts`가 받고, 실제 처리는 `auth.service.ts`가 담당한다. | 확인됨 | `apps/api/src/modules/auth/auth.routes.ts:42-113` |
| Route와 Service를 왜 나누는가? | Route는 요청·middleware·응답을 담당하고, Service는 업무 규칙과 Database 처리를 담당해 관심사를 분리한다. | 확인됨 | `apps/api/src/modules/sources/source.routes.ts:130-147`, `source.service.ts:333-378` |
| 로그인하지 않은 사용자가 수정 API를 호출하면 Service까지 가는가? | `authenticate`에서 access token이 없거나 유효하지 않으면 401로 종료되어 Service에 도달하지 않는다. | 확인됨 | `apps/api/src/middleware/authenticate.ts:6-15` |
| 다른 사용자의 글 수정은 어디서 최종 차단하는가? | Service의 `assertOwner`가 DB의 작성자 ID와 현재 사용자 ID를 비교해 다르면 403을 반환한다. | 확인됨 | `apps/api/src/modules/sources/source.service.ts:326-345` |
| 수정 버튼을 숨기면 보안이 완성되는가? | 아니다. 버튼 숨김은 UX이고, 최종 보안은 Backend의 권한 검사다. | 확인됨 | `apps/web/src/features/sources/source-detail-view.tsx:306-315`, `apps/api/src/modules/sources/source.service.ts:326-345` |
| `packages/shared`의 목적은 무엇인가? | Web과 API가 같은 타입·검증 규칙을 사용해 API 계약의 불일치를 줄이는 것이다. | 확인됨 | `packages/shared/src/index.ts`, `pnpm-workspace.yaml` |

## 판단

- 확인됨:
  - 학습자는 Web/API의 큰 역할과 `packages/shared`의 공통 계약 역할을 자신의 말로 설명했다.
  - 학습자는 처음에 Route가 고유값과 버튼 노출로 권한을 결정한다고 이해했지만, 설명 후 middleware 차단과 Service의 최종 소유권 검사를 구분하는 방향으로 수정했다.
  - 다음 학습은 현재 구조를 인증 기능에 적용하면 자연스럽게 이어진다.
- 추론:
  - 인증은 Route·Middleware·Service·Cookie가 동시에 연결되므로 게시글 권한을 이해한 직후 설명하는 것이 효과적이다.
  - 발표 답변은 폴더 이름 나열보다 “사용자 행동 → 요청 주소 → 담당 모듈 → 검증 → 저장/응답” 순서로 연습하는 편이 적합하다.
- 미확인:
  - 실제 실행 중 요청과 응답을 캡처하지 않았다.
  - JWT payload 구성과 access/refresh 만료·회전 세부 사항은 아직 확인하지 않았다.
  - Frontend의 Query cache와 새로고침 복구 과정은 개요만 확인했고, 인증 코드 단위 추적은 다음 단계다.

## 다음 계획

1. `auth.routes.ts`와 `auth.service.ts`의 회원가입 API를 읽는다 — 의존성: 현재 Route/Service 구분 — 확인 방법: `rg -n "signup|verifyEmail|login|getMe" apps/api/src/modules/auth`.
2. 회원가입·이메일 인증 흐름을 설명한다 — 의존성: 사용자 DB와 메일 연동 — 확인 방법: auth service와 `integrations/mail.ts`의 저장·발송·검증 흐름 대조.
3. 로그인·JWT·쿠키·`/me` 복구를 설명한다 — 의존성: `authenticate.ts`, `jwt.ts`, Web auth API — 확인 방법: 관련 파일의 cookie 설정과 token 검증 심볼 확인.
4. 인증 예상 질문을 30초 답변과 꼬리 질문으로 연습한다 — 의존성: 1~3단계 — 확인 방법: 학습자가 로그인 요청 전체를 순서대로 설명.

## 중단 또는 방향 전환 조건

- 실제 코드의 동작이 기존 학습 문서와 다르면 코드와 실행 결과를 우선 근거로 삼고 문서와의 차이를 별도 기록한다.
- 인증 흐름을 설명하는 중 새로운 요구사항이나 구현 변경 요청이 나오면 학습 기록과 코드 변경 작업을 분리한다.
