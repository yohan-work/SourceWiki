# SourceLink Wiki Phase 2 작업 인계서

> - 마지막 갱신: 2026-06-22 (Asia/Seoul)
> - 브랜치: `main`
> - 현재 기준 커밋: `523d625 fix : prettier gr`
> - 원격 상태: `main`과 `origin/main`이 `523d625`로 일치
> - 작업 트리: 문서 작성 시작 전 clean
> - Phase 상태: 인증 기반 구현 완료, 다음 기능 단계는 Phase 3 Core CRUD

## 1. 이 문서의 목적

이 문서는 새 Codex session이나 다른 개발 환경에서 Phase 2의 구현 맥락을 복구하고 Phase 3를 이어가기 위한 기준 문서다.

다음 session에서는 이 문서를 먼저 읽되, 코드가 이후 변경됐을 수 있으므로 반드시 `git status`, 현재 branch, 최신 commit을 다시 확인한다. Phase 1 기반 설명은 `process-docs/phase-01-handoff.md`, 인증 실행·DB 확인 절차는 `docs/12-authentication-development-guide.md`를 참고한다.

## 2. Phase 2 목표와 완료 범위

Phase 2에서는 Phase 1의 Next.js·Express·PostgreSQL 기반 위에 이메일 인증과 cookie 기반 JWT session을 추가했다.

완료된 범위:

- `users`, `email_verification_tokens`, `refresh_sessions` Prisma model과 migration
- 이메일 정규화, bcrypt cost 12 비밀번호 hash, DB unique constraint
- 회원가입, 이메일 중복 확인 API, 인증·재전송, 로그인·로그아웃·refresh·me API
- 30분 일회용 이메일 token과 DB SHA-256 hash 저장
- access 15분, refresh 14일 JWT와 HttpOnly cookie
- refresh rotation, session family, 이전 token 재사용 탐지와 family 폐기
- mutation Origin 검증, 인증 endpoint별 in-memory rate limit
- 공통 Zod 인증 schema, `fieldErrors`가 포함된 API 오류 계약
- Mailpit SMTP 개발 환경과 Compose 연동
- 가입·인증 대기·인증 결과·로그인 화면
- TanStack Query 기반 `/auth/me` 복구와 header 로그인 상태
- 공통 `apiFetch`, `ApiError`, timeout, single-flight refresh, 원 요청 1회 재시도
- 실제 PostgreSQL을 사용하는 Auth API 통합 테스트
- CI에서 migration 적용 후 lint, typecheck, test, build, format 검사
- 인증 개발 가이드와 단계별 학습 문서

아직 자료·댓글 CRUD, 태그, 페이징, Swagger/OpenAPI는 구현하지 않았다. 다음 단계는 `docs/09-development-roadmap.md`의 Phase 3이다.

## 3. 현재 실행 구조

### Hybrid 개발 모드

```text
Browser
  |-- http://localhost:3000  --> Next.js
  |                                `-- /api rewrite
  |                                      --> Express localhost:4000
  |
  |-- http://localhost:8025  --> Mailpit UI
  |
  `-- Express
        |-- PostgreSQL localhost:5432
        `-- SMTP localhost:1025 --> Mailpit
```

실행 순서:

```bash
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm db:deploy
docker compose ps
pnpm dev
```

`pnpm dev:infra`는 `db`와 `mailpit`을 실행한다. `pnpm db:deploy`는 Auth migration을 적용한다.

### 전체 Docker 모드

```text
사용자
  |
  | http://localhost:8080
  v
Caddy
  |-- /api/* --> API:4000 --> PostgreSQL:5432
  `-- 그 외  --> Web:3000

API --> Mailpit SMTP:1025
사용자 --> Mailpit UI localhost:8025
```

Compose 서비스는 `mailpit`, `db`, `api`, `web`, `caddy` 다섯 개다. API container는 시작할 때 `prisma migrate deploy`를 실행하며 준비 순서는 `db/mailpit healthy → api healthy → web healthy → caddy`다.

```bash
pnpm docker:up
pnpm docker:down
```

## 4. DB와 migration

### `users`

- UUID PK
- 정규화된 unique email
- bcrypt password hash
- nickname
- nullable `email_verified_at`
- 생성·수정 시간

### `email_verification_tokens`

- 사용자 FK, user 삭제 시 cascade
- SHA-256 `token_hash`만 저장
- 30분 `expires_at`
- 사용 또는 재전송 폐기를 나타내는 `used_at`
- 재전송 시 기존 미사용 token을 먼저 폐기

### `refresh_sessions`

- 사용자 FK, user 삭제 시 cascade
- 로그인 회전 체인을 묶는 `family_id`
- refresh JWT SHA-256 hash
- 만료·폐기 시간
- 다음 session을 가리키는 self relation `replaced_by_id`
- 폐기 후 교체된 token이 다시 제시되면 family의 활성 session을 모두 폐기

관련 파일:

```text
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/20260622000000_add_auth/migration.sql
apps/api/prisma/migrations/migration_lock.toml
apps/api/src/lib/database.ts
```

Prisma client는 `apps/api/src/generated/prisma`에 생성되고 Git에는 포함하지 않는다.

## 5. Auth API 계약

Base path는 `/api/auth`다.

| Method | Path                   | 역할                                    | 성공 상태 |
| ------ | ---------------------- | --------------------------------------- | --------- |
| POST   | `/check-email`         | 이메일 사용 가능 여부                   | 200       |
| POST   | `/signup`              | 미인증 사용자 생성과 인증 메일 발송     | 201       |
| POST   | `/verify-email`        | 일회용 token 검증과 이메일 인증         | 200       |
| POST   | `/resend-verification` | 기존 미사용 token 폐기 후 재발송        | 200       |
| POST   | `/login`               | 사용자 검증과 두 cookie 발급            | 200       |
| POST   | `/refresh`             | refresh rotation과 cookie 교체          | 204       |
| POST   | `/logout`              | 현재 refresh session 폐기와 cookie 제거 | 204       |
| GET    | `/me`                  | access cookie 기준 현재 사용자          | 200       |

사용자 응답 DTO:

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "기록자",
    "emailVerified": true,
    "createdAt": "ISO-8601"
  },
  "meta": { "requestId": "uuid" }
}
```

오류 응답은 `code`, `message`, `requestId`, 선택적 `fieldErrors`를 사용한다. 주요 인증 code는 다음과 같다.

```text
VALIDATION_ERROR
EMAIL_ALREADY_EXISTS
EMAIL_DELIVERY_FAILED
INVALID_CREDENTIALS
EMAIL_NOT_VERIFIED
TOKEN_INVALID
TOKEN_EXPIRED
TOKEN_USED
SESSION_EXPIRED
SESSION_REUSED
UNAUTHENTICATED
ORIGIN_NOT_ALLOWED
RATE_LIMITED
```

관련 파일:

```text
packages/shared/src/index.ts
apps/api/src/modules/auth/auth.routes.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/middleware/validate.ts
apps/api/src/middleware/authenticate.ts
apps/api/src/middleware/origin.ts
apps/api/src/errors/app-error.ts
apps/api/src/middleware/error-handler.ts
```

## 6. JWT, cookie, session 동작

JWT claim은 `sub`, `type`, `jti`, `iat`, `exp`만 사용한다. issuer와 audience도 검증한다. access와 refresh는 서로 다른 secret으로 HS256 서명한다.

| Cookie          | 수명 | SameSite | Path        | 용도           |
| --------------- | ---- | -------- | ----------- | -------------- |
| `access_token`  | 15분 | Lax      | `/`         | 일반 인증 API  |
| `refresh_token` | 14일 | Strict   | `/api/auth` | refresh·logout |

두 cookie는 HttpOnly다. `COOKIE_SECURE`는 개발 HTTP에서 false이며 운영 HTTPS에서는 반드시 true로 설정해야 한다.

refresh 흐름:

```text
refresh JWT 서명·claim 검증
  ↓
jti로 refresh_sessions 조회
  ↓
JWT 원문 hash와 DB token_hash timing-safe 비교
  ↓
새 session/JWT 생성
  ↓ transaction
기존 session revoked + replaced_by_id 연결
  ↓
새 access/refresh cookie 응답
```

이미 교체된 token이 다시 사용되면 `SESSION_REUSED`를 반환하고 같은 family의 활성 session을 폐기한다. 로그아웃은 유효하지 않은 refresh cookie가 있어도 204를 반환하도록 idempotent하게 처리한다.

## 7. 이메일 인증과 Mailpit

SMTP adapter는 Nodemailer 기반이며 현재 인증 없는 로컬 SMTP 연결만 구성되어 있다.

```text
apps/api/src/integrations/mail.ts
SMTP host/port 기본값: localhost:1025
Mailpit UI: http://localhost:8025
```

개발 환경에서는 실제 Gmail이나 외부 주소로 전달되지 않는다. 받는 주소와 무관하게 Mailpit이 수신한다.

가입은 사용자와 token을 DB에 저장한 뒤 transaction 밖에서 SMTP를 호출한다. 따라서 SMTP 실패 시 API는 `EMAIL_DELIVERY_FAILED`를 반환하지만 미인증 계정은 DB에 남는다. 이 경우 재가입하면 `EMAIL_ALREADY_EXISTS`가 발생하므로 Mailpit을 정상화한 뒤 재전송해야 한다.

인증 link 원본 token은 이메일에만 있고, DB에는 hash만 저장한다. 인증 결과 화면은 처리 시작 후 browser URL에서 token query를 제거한다.

기본 rate limit:

| Endpoint            | 제한           |
| ------------------- | -------------- |
| check-email         | IP당 15분 10회 |
| signup              | IP당 1시간 5회 |
| verify-email        | IP당 15분 10회 |
| resend-verification | IP당 1시간 3회 |
| login               | IP당 15분 10회 |
| refresh/logout      | IP당 15분 30회 |

현재 rate limit store는 process memory다. API 재시작 시 초기화되고 다중 instance 간 공유되지 않는다.

## 8. Web 인증 구조

공개 route:

```text
/signup
/verify-email/pending
/verify-email
/login
```

주요 구현:

```text
apps/web/src/app/login/page.tsx
apps/web/src/app/signup/page.tsx
apps/web/src/app/verify-email/page.tsx
apps/web/src/app/verify-email/pending/page.tsx
apps/web/src/features/auth/
apps/web/src/lib/api/api-client.ts
apps/web/src/lib/query/query-provider.tsx
apps/web/src/components/site-header.tsx
```

- React Hook Form과 공유 Zod schema로 입력을 검증한다.
- API의 `fieldErrors`를 form field에 연결하고 일반 오류는 form alert에 유지한다.
- TanStack Query의 `['auth', 'me']`가 로그인 사용자 server state의 기준이다.
- header는 `/me` 확인 중 skeleton, 비회원이면 로그인·가입, 회원이면 nickname·logout을 표시한다.
- JWT 원문은 localStorage, Zustand, Query cache에 저장하지 않는다.
- 로그인 성공 시 `/me` cache에 사용자 DTO를 넣고 로그아웃 시 null로 바꾼다.
- `returnTo`는 `/`로 시작하고 `//`로 시작하지 않는 내부 경로만 허용한다.

`apiFetch`는 `credentials: include`, JSON 처리, 10초 timeout, 공통 오류 변환을 제공한다. 401이면 module-level single-flight promise로 refresh를 한 번만 실행하고 각 원 요청을 정확히 한 번 재시도한다. login, refresh, logout 자체는 자동 refresh 대상에서 제외한다.

## 9. 환경변수

`.env.example`에 다음 인증 변수가 추가됐다.

```text
APP_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ISSUER
JWT_AUDIENCE
SMTP_HOST
SMTP_PORT
SMTP_FROM
COOKIE_SECURE
```

주의사항:

- example secret은 로컬 전용이며 운영에서 재사용하면 안 된다.
- production HTTPS에서는 `APP_URL`을 실제 origin으로, `COOKIE_SECURE=true`로 설정한다.
- Origin 검증은 `APP_URL`의 origin과 요청 `Origin`의 정확한 일치를 요구한다.
- Compose API는 `SMTP_HOST=mailpit`, hybrid 기본값은 `localhost`다.
- API runtime의 `env.ts`는 `process.env`를 검증하지만 root `.env`를 명시적으로 load하지 않는다. 현재 hybrid 기본값은 `.env.example`과 맞지만, 값을 변경할 때는 shell export 또는 별도 env loading 방식을 정리해야 한다.

## 10. 테스트와 검증 상태

현재 자동 테스트는 총 15개다.

| 영역   | 파일 수 / 테스트 수 | 주요 검증                                            |
| ------ | ------------------- | ---------------------------------------------------- |
| shared | 1 / 3               | 응답 schema, 오류 계약, 이메일 정규화                |
| API    | 4 / 8               | health, crypto, Origin·validation, Auth DB 통합 흐름 |
| Web    | 2 / 4               | health UI, ApiError, concurrent 401 single-flight    |

Auth 통합 테스트는 실제 PostgreSQL과 fake mail adapter를 사용해 다음 흐름을 검증한다.

```text
signup → token 추출 → verify → login → me
→ refresh rotation → 이전 token reuse 탐지
→ 재로그인 → logout → me 401
```

구현 당시 다음 검증이 성공했다.

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`: shared 3, API 8, Web 4
- `pnpm build`
- `pnpm format:check`
- `docker compose config --quiet`
- `git diff --check`
- Auth migration을 빈 DB에 `prisma migrate deploy`
- Mailpit 실제 SMTP 가입 메일 수신
- 이메일 인증 → 로그인 → `/me` → refresh → logout API smoke
- Web/API Docker image build와 다섯 Compose 서비스 healthy
- Caddy 경유 `/signup`, login/refresh/logout 응답

Supertest는 임시 localhost socket을 열기 때문에 제한된 sandbox에서는 `listen EPERM`이 발생할 수 있다. 일반 local terminal 또는 GitHub Actions에서 실행한다.

CI `quality` job은 PostgreSQL service를 시작하고 다음 순서로 실행한다.

```text
install → db:deploy → lint → typecheck → test → build → format:check
```

`compose-smoke`는 전체 stack을 빌드하지만 현재 `/`, health live/ready만 자동 확인한다. 인증 브라우저 E2E는 CI에 없다.

## 11. 확인된 미완료 및 주의점

다음 항목은 Phase 2 설계 문서에 언급됐지만 현재 코드에는 없거나 제한적으로 구현됐다.

- 실제 외부 SMTP provider의 인증·TLS·credential 설정은 없다. 현재는 Mailpit 전용이다.
- Playwright 기반 가입→메일→인증→로그인 E2E는 없다. API 통합 테스트와 수동 smoke만 있다.
- 회원가입 화면은 `check-email` API를 blur 또는 버튼으로 호출하지 않는다. 가입 API unique 검증만 실제 UI에 연결돼 있다.
- 보호 route middleware와 실제 보호 화면은 없다. 자료 등록·수정 route가 Phase 3에서 생길 때 구현해야 한다.
- `requireVerifiedUser` middleware가 아직 없다. 현재 login 자체가 미인증 사용자를 차단하지만 Phase 3 작성 API에서 DB 인증 상태를 재검증해야 한다.
- Swagger UI `/api/docs`와 OpenAPI `/api/openapi.json`은 아직 없다.
- rate limit은 in-memory라 다중 API instance 또는 재시작 간 상태를 공유하지 않는다.
- 인증 token 7일 정리와 만료 refresh session cleanup job은 없다.
- `docs/11-current-infrastructure.md`는 Phase 1 기준이라 서비스 4개, 업무 model·migration 없음 등 현재와 다른 설명이 남아 있다. 현재 인증 실행 상태는 이 문서와 `docs/12-authentication-development-guide.md`를 우선한다.
- source, comment, tag model과 seed는 아직 없다.
- Web/API Dockerfile은 여전히 단일 stage이며 CD는 구현되지 않았다.

## 12. 다음 session 시작 절차

### 저장소와 환경 확인

```bash
git status
git branch --show-current
git log -5 --oneline
node --version
pnpm --version
docker --version
docker compose version
```

기준은 Node 24 LTS, pnpm 10.34.0, PostgreSQL 17이다. 예상하지 않은 변경 파일이나 이미 실행 중인 3000/4000 port process가 있으면 임의로 종료하거나 덮어쓰지 않는다.

### 의존성과 DB 준비

```bash
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm db:deploy
pnpm db:generate
docker compose ps
```

### 현재 기준 회귀 검사

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config --quiet
git diff --check
```

### 인증 수동 확인

```text
Web:       http://localhost:3000
Signup:    http://localhost:3000/signup
Login:     http://localhost:3000/login
Mailpit:   http://localhost:8025
API live:  http://localhost:4000/api/health/live
API ready: http://localhost:4000/api/health/ready
```

회원과 session 확인 명령은 `docs/12-authentication-development-guide.md`를 참고한다.

## 13. Phase 3 권장 시작 순서

Phase 3 목표는 source·comment CRUD, tag 관계, 서버 페이징, 작성자 권한, 화면, Swagger다.

권장 구현 순서:

1. `docs/02-requirements.md`, `docs/03-screen-plan.md`, `docs/04-database-design.md`, `docs/05-api-design.md`의 Phase 3 계약을 다시 확인한다.
2. `Source`, `Comment`, `Tag`, `SourceTag` Prisma model과 User relation, index, cascade 정책을 추가하고 migration을 만든다.
3. 인증 완료 사용자 2명, source 13개 이상, comment를 포함하는 local/demo seed를 추가한다.
4. shared package에 source/comment request·response·pagination schema와 enum을 추가한다.
5. API에 `requireVerifiedUser`, 선택적 access 인증, 소유권 검사 기반을 추가한다.
6. 공개 source 목록·상세와 인증 생성, 작성자 수정·삭제를 구현한다.
7. 공개 comment 조회와 인증 생성, 작성자 수정·삭제를 구현한다.
8. `/api/docs`, `/api/openapi.json`과 schema 검증을 추가한다.
9. Web에 `/sources`, `/sources/new`, `/sources/[id]`, `/sources/[id]/edit`과 comment UI를 구현한다.
10. 비회원·작성자·타인 사용자 권한, 13개 이상 seed 페이징, cascade를 통합/E2E 테스트한다.
11. Docker/CI 회귀와 문서를 갱신한다.

Phase 3에서 지켜야 할 기존 인증 경계:

- 공개 목록·상세·댓글 조회는 인증 없이 허용한다.
- source/comment mutation은 access 인증과 현재 DB의 이메일 인증 상태를 요구한다.
- 소유권은 client의 `isOwner`가 아니라 service query의 `userId` 조건으로 최종 검증한다.
- access 만료 401은 Web `apiFetch`가 refresh 후 한 번 재시도할 수 있어야 한다.
- source 삭제 시 comment와 source-tag 관계의 cascade/transaction 정책을 테스트한다.

## 14. 관련 문서 읽기 순서

1. `process-docs/phase-02-handoff.md`: 현재 구현과 다음 시작점
2. `docs/12-authentication-development-guide.md`: 실행·접속·DB 확인
3. `docs/learning/05-phase2-auth-overview.md`부터 `10-auth-testing-debugging.md`: 인증 학습 자료
4. `docs/02-requirements.md`: Phase 3 기능과 권한 기준
5. `docs/04-database-design.md`: source/comment/tag model
6. `docs/05-api-design.md`: REST endpoint와 DTO
7. `docs/03-screen-plan.md`: source/comment 화면 흐름
8. `docs/06-frontend-architecture.md`: Query와 Server/Client 경계
9. `docs/07-backend-architecture.md`: module/service/repository 경계
10. `docs/09-development-roadmap.md`: Phase 3 완료 기준

## 15. Phase 2 커밋 이력

핵심 구현 commit:

```text
c6d8944 chore(deps): add phase two auth dependencies
21a8fcb feat(api): implement email authentication sessions
19e4fe3 feat(web): add authentication user flows
c95b1ba chore(infra): wire auth migration and mailpit
60d6246 feat : basic learning data(ing)
de07aa9 fix : prettier gr
523d625 fix : prettier gr
```

이 문서 작성 시점의 `main`과 `origin/main`은 `523d625`에서 일치한다.
