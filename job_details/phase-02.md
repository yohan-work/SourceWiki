# Phase 2 인증 구현 계획

  ## 요약

  DB 모델부터 Auth API, Mailpit 이메일 인증, 프론트 인증 화면, 쿠키 세션 복구와 E2E까지 하나의 milestone으로 구현한다. 기존 health
  API와 Docker/CI 동작은 유지한다.

  ## 구현 변경

  1. 인증 기반과 DB
      - User, EmailVerificationToken, RefreshSession Prisma 모델과 인덱스·관계·초기 migration을 추가한다.
      - 이메일은 trim/lowercase, 비밀번호는 8~72자·bcrypt cost 12로 처리한다.
      - jose, bcrypt, cookie-parser, nodemailer, express-rate-limit 기반 인증·메일 모듈을 구성한다.
      - access/refresh secret, issuer, audience, 앱 URL, SMTP, 쿠키 보안 설정을 환경변수로 검증한다.

  2. Auth API와 보안
      - 다음 API를 구현한다:
          - POST /api/auth/check-email
          - POST /api/auth/signup
          - POST /api/auth/verify-email
          - POST /api/auth/resend-verification
          - POST /api/auth/login
          - POST /api/auth/refresh
          - POST /api/auth/logout
          - GET /api/auth/me

      - access 15분, refresh 14일의 HttpOnly 쿠키를 사용하고 refresh는 rotation 및 family 단위 재사용 탐지를 적용한다.
      - mutation에 same-origin Origin 검증을 적용하고 auth endpoint별 rate limit을 환경설정 가능한 기본값으로 제공한다.
      - Zod validation 오류에 fieldErrors를 추가하고 Prisma 모델을 직접 반환하지 않는 사용자 DTO mapper를 둔다.
      - 메일 발송은 DB transaction 밖에서 수행한다. 발송 실패 시 미인증 계정은 유지하고 EMAIL_DELIVERY_FAILED와 재발송 경로를 제공한
        다.

  3. Mailpit과 실행 환경
      - Compose에 Mailpit SMTP/API/UI 서비스를 추가한다.
      - 컨테이너 API는 mailpit:1025, hybrid 개발 API는 localhost:1025를 사용한다.
      - 인증 링크에는 32-byte random token을 포함하고 DB에는 SHA-256 hash만 저장한다.
      - 재발송 시 기존 미사용 토큰을 폐기하고 새 토큰을 발행한다.

  4. Web 인증 흐름
      - TanStack Query provider, React Hook Form, 공통 apiFetch와 ApiError를 추가한다.
      - API client는 credentials: include, timeout, 오류 parsing, single-flight refresh와 원 요청 1회 재시도를 지원한다.
      - /signup, /verify-email/pending, /verify-email, /login 화면을 구현한다.
      - /auth/me를 로그인 상태의 기준으로 삼고 헤더에 로그인·가입 또는 닉네임·로그아웃을 표시한다.
      - 인증 토큰 처리 후 URL에서 token을 제거하며 returnTo는 내부 절대 경로만 허용한다.
      - 보호 route 기반은 함께 구성하되 자료 등록·수정 화면 자체는 Phase 3에서 구현한다.

  ## 공개 인터페이스

  - 공유 패키지에 인증 요청/응답 Zod schema, 사용자 요약 DTO, fieldErrors 포함 공통 오류 타입을 추가한다.
  - JWT claim은 sub, type, jti, iat, exp만 사용한다.
  - 주요 오류 코드는 EMAIL_ALREADY_EXISTS, INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED, TOKEN_INVALID, TOKEN_EXPIRED, TOKEN_USED,
    SESSION_EXPIRED, SESSION_REUSED, UNAUTHENTICATED, RATE_LIMITED, EMAIL_DELIVERY_FAILED로 고정한다.

  - cookie 이름은 access_token, refresh_token으로 하고 refresh cookie 경로는 /api/auth, access는 /로 설정한다.

  ## 테스트 및 완료 기준

  - 단위·통합: 이메일 정규화/중복 경쟁, bcrypt, 토큰 만료·사용·재발송, 미인증 로그인 차단, JWT 검증, refresh 회전·동시 요청·재사용
    family 폐기, 로그아웃, Origin 및 rate limit.

  - 프론트: 폼 validation과 field 오류 focus, 인증 상태 3단계, single-flight refresh, 안전한 returnTo, 인증 결과별 UI.
  - E2E: Mailpit API에서 실제 인증 링크를 조회해 가입 → 인증 → 로그인 → 새로고침 복구 → access 만료 갱신 → 로그아웃 흐름을 검증한다.
  - 회귀: lint, typecheck, test, build, format, migration deploy, Compose health/smoke를 통과한다.
  - Phase 2 완료 시 API/환경변수/로컬 Mailpit 사용법과 인증 보안 결정을 README 및 설계 문서에 동기화한다.

  ## 가정

  - 운영 SMTP 사업자 선정은 배포 단계로 미루고 Phase 2는 표준 SMTP 계약으로 구현한다.
  - Zustand는 인증 서버 상태에 사용하지 않으며 실제 공유 UI 상태가 생길 때 도입한다.
  - Swagger 전체 구축은 후속 API 문서 단계에서 진행하되 인증 schema는 재사용 가능한 형태로 작성한다.
  - 현재 사용자 변경인 apps/web/next-env.d.ts는 보존하며 Phase 2 작업에 포함하지 않는다.