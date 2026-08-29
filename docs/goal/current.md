# 현재 목표

- 상태: 진행 중
- 마지막 갱신: 2026-08-29 16:15 KST
- 현재 작업 단위: SourceWiki 발표 대비 전체 구조 학습

## 목표와 성공 기준

- 목표: `docs/learning_data/requirement-q.md`의 과제 기준과 SourceWiki의 실제 구조를 연결해 이해하고, 발표 예상 질문에 자신의 말로 답할 수 있도록 학습한다.
- 성공 기준: 사용자의 행동이 Frontend → API Route → Middleware → Service → Database로 흐르는 과정을 설명하고, 기능별 폴더와 인증·권한 처리 위치를 코드 근거와 함께 말할 수 있다.

## 범위와 확정된 결정

- 포함: 요구사항 문서 분석, 모노레포 최상위 구조, `apps/web`, `apps/api`, `packages/shared`, Docker·infra·GitHub Actions의 역할, Route와 Service의 차이, 자료 수정 권한 흐름.
- 제외: 이번 세션에서 JWT 세부 claim, 회원가입·이메일 인증·로그인 전체 추적, DB 스키마 세부 설명, 상태 관리 심화, 배포 실습과 테스트 실행.
- 결정: 학습은 단계별로 진행한다. 각 단계는 쉬운 비유 → 실제 프로젝트 구조 → 코드 흐름 → 발표용 답변 → 이해 점검 순서로 설명한다. 화면에서 버튼을 숨기는 UX와 Backend의 최종 권한 검사를 구분한다.

## 현재 상태

- 완료:
  - 과제의 평가 중심이 Frontend 구현 완성도와 전체 요청 흐름 이해라는 점을 확인했다.
  - `apps/web`은 화면과 API 호출, `apps/api`는 Backend 업무 처리, `packages/shared`는 Web/API 공통 계약이라는 역할을 정리했다.
  - `apps/api/src/app.ts`가 URL에 따라 `auth`, `sources`, `comments`, `users`, `files` 등의 기능별 Router를 선택한다는 점을 확인했다.
  - Route는 요청·middleware·응답을 담당하고 Service는 비즈니스 로직·Database 처리를 담당한다는 차이를 학습했다.
  - 자료 수정 시 로그인·이메일 인증은 middleware에서, 작성자 여부는 `source.service.ts`의 `assertOwner`에서 최종 확인한다는 흐름을 확인했다.
- 진행 중:
  - 회원가입 → 이메일 인증 → 로그인 → JWT 쿠키 → `/me` 복구 흐름 학습.
- 차단 요인 또는 미검증:
  - 실행 환경에서 테스트·E2E·실제 API 요청은 이번 세션에 실행하지 않았다.
  - 인증과 상태 관리의 세부 동작은 아직 학습 전이다.

## 마지막 체크포인트

- Handoff: [2026-08-29-1615-sourcewiki-learning-structure](../handoff/2026-08-29-1615-sourcewiki-learning-structure.md)
- Socratic: [2026-08-29-1615-sourcewiki-learning-structure](../socratic/2026-08-29-1615-sourcewiki-learning-structure.md)

## 재개 지점

1. `apps/api/src/modules/auth/auth.routes.ts`와 `auth.service.ts`, `apps/web/src/features/auth`를 기준으로 회원가입·이메일 인증·로그인 요청을 단계별로 추적한다.
2. `POST /api/auth/signup`, `POST /api/auth/verify-email`, `POST /api/auth/login`, `GET /api/auth/me`의 역할과 응답·쿠키 흐름을 표로 정리한다.
3. 각 흐름을 “무엇을 했는가”가 아니라 “왜 필요한가” 중심의 발표 답변으로 바꾸고, 짧은 이해 점검을 진행한다.
