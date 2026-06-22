# 05. Phase 2 인증의 전체 흐름

## Phase 2에서 만든 것

Phase 1에서는 Web, API, DB가 서로 연결되는 기반을 만들었습니다. Phase 2에서는 이 기반 위에 실제 사용자 인증을 추가했습니다.

구현된 기능은 다음과 같습니다.

- 이메일 중복 확인과 회원가입
- 비밀번호 bcrypt hash 저장
- Mailpit을 이용한 개발용 이메일 인증
- 인증 메일 재전송
- 로그인과 로그아웃
- access JWT와 refresh JWT
- refresh token 회전과 재사용 탐지
- `/api/auth/me`를 이용한 로그인 상태 복구
- 쿠키, Origin 검사, rate limit을 이용한 보안 처리

## 전체 구조

인증 요청도 기존 모노레포 구조를 따라 이동합니다.

```text
사용자
  ↓
Next.js 인증 화면
  ↓ HTTP /api/auth/*
Express Auth API
  ├─ PostgreSQL: 회원, 인증 token, session 저장
  └─ Mailpit: 개발용 인증 메일 수신
```

각 폴더의 책임은 다음과 같습니다.

```text
packages/shared/src/index.ts
  Web과 API가 같이 쓰는 입력 schema와 응답 type

apps/api/src/modules/auth
  회원가입, 인증, 로그인, session 비즈니스 로직

apps/api/src/integrations/mail.ts
  SMTP로 인증 메일을 보내는 adapter

apps/web/src/features/auth
  인증 form, API 호출, 로그인 상태 query

apps/web/src/app/login, signup, verify-email
  사용자가 실제로 접근하는 인증 route
```

## 가입부터 로그인까지

사용자 관점에서는 다음 순서입니다.

```text
회원가입 form 제출
  ↓
users에 미인증 회원 저장
  ↓
인증 token 생성 및 hash 저장
  ↓
Mailpit으로 인증 링크 발송
  ↓
사용자가 링크 선택
  ↓
email_verified_at 기록
  ↓
로그인 허용
  ↓
access/refresh cookie 발급
```

중요한 규칙은 이메일 인증을 완료하기 전에는 로그인할 수 없다는 점입니다.

## 로그인 상태는 어디에 저장되는가?

프론트엔드는 JWT를 `localStorage`나 Zustand에 저장하지 않습니다.

```text
브라우저
  └─ HttpOnly cookie
       ├─ access_token
       └─ refresh_token
```

JavaScript가 cookie 값을 직접 읽지 않고, 브라우저가 API 요청에 자동으로 포함합니다. 프론트가 알아야 하는 사용자 정보는 `/api/auth/me` 응답으로 가져옵니다.

## 왜 단계를 나누어 구현했는가?

인증은 한 endpoint만 추가해서 끝나는 기능이 아닙니다.

```text
DB 구조
  ↓
암호화와 token
  ↓
메일 연동
  ↓
API와 cookie
  ↓
프론트 상태 복구
  ↓
통합 테스트
```

앞 단계의 계약이 다음 단계의 기준이 되므로 이 순서로 구현했습니다. 이어지는 문서에서 각 단계를 자세히 설명합니다.

## 기억할 것

- Web은 인증 화면과 사용자 경험을 담당합니다.
- API는 비밀번호, token, session의 신뢰 경계입니다.
- DB에는 비밀번호와 token 원문을 저장하지 않습니다.
- Mailpit은 개발 환경에서 실제 메일 대신 사용하는 로컬 메일함입니다.
- 로그인 상태의 기준은 브라우저 저장소가 아니라 cookie와 `/auth/me`입니다.
