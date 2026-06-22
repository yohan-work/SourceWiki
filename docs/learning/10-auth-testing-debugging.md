# 10. 인증 테스트와 디버깅

## 먼저 실행 환경 준비

Hybrid 개발 환경은 다음 순서로 실행합니다.

```bash
pnpm dev:infra
pnpm db:deploy
docker compose ps
pnpm dev
```

`docker compose ps`에서 `db`, `mailpit`이 healthy인지 확인합니다.

```text
Web:       http://localhost:3000
API:       http://localhost:4000
Mailpit:   http://localhost:8025
Postgres:  localhost:5432
```

## 수동 테스트 순서

다음 시나리오를 순서대로 확인하면 인증 전체 흐름을 한 번에 검증할 수 있습니다.

```text
1. /signup에서 새 계정 생성
2. Mailpit에서 인증 메일 확인
3. 인증 링크 선택
4. /login에서 로그인
5. 새로고침 후 닉네임 유지 확인
6. 개발자 도구에서 cookie 확인
7. 로그아웃
8. 새로고침 후 비로그인 상태 확인
```

추가 오류 시나리오도 확인합니다.

- 같은 이메일로 다시 가입하면 `EMAIL_ALREADY_EXISTS`
- 인증 전 로그인하면 `EMAIL_NOT_VERIFIED`
- 같은 인증 링크를 다시 사용하면 `TOKEN_USED`
- 존재하지 않는 token은 `TOKEN_INVALID`
- 다른 Origin의 mutation은 `ORIGIN_NOT_ALLOWED`

## 자동 테스트

전체 테스트:

```bash
pnpm test
```

품질 검증 전체:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config --quiet
```

API integration test는 실제 PostgreSQL을 사용합니다. 따라서 테스트 전에 DB와 migration이 준비되어야 합니다.

```bash
pnpm dev:infra
pnpm db:deploy
pnpm test
```

## 어떤 테스트가 있는가?

### 공유 schema 테스트

```text
packages/shared/src/index.test.ts
```

- 이메일 정규화
- 인증 요청 schema
- 공통 오류 구조

### API 경계 테스트

```text
apps/api/src/modules/auth/auth.routes.test.ts
```

- 잘못된 Origin 차단
- Zod validation과 fieldErrors 변환

### API 통합 테스트

```text
apps/api/src/modules/auth/auth.integration.test.ts
```

실제 DB를 사용해 다음을 한 흐름으로 확인합니다.

```text
가입
→ 이메일 token 발급
→ 인증
→ 로그인
→ /me
→ refresh 회전
→ 이전 token 재사용 탐지
→ 로그아웃
```

메일만 fake adapter로 바꿔 외부 I/O 없이 verification URL을 가져옵니다.

### 프론트 API client 테스트

```text
apps/web/src/lib/api/api-client.test.ts
```

- 공통 API 오류를 `ApiError`로 변환
- 여러 동시 401에서 refresh가 한 번만 실행되는지 확인
- refresh 후 각 원 요청이 한 번씩 재시도되는지 확인

## DB에서 상태 확인

```bash
docker compose exec db psql -U sourcewiki -d sourcewiki
```

```sql
SELECT email, email_verified_at, created_at
FROM users
ORDER BY created_at DESC;

SELECT user_id, expires_at, used_at
FROM email_verification_tokens
ORDER BY created_at DESC;

SELECT user_id, family_id, revoked_at, replaced_by_id
FROM refresh_sessions
ORDER BY created_at DESC;
```

## 브라우저에서 확인

개발자 도구의 Network panel에서 다음 요청을 확인합니다.

```text
POST /api/auth/signup
POST /api/auth/verify-email
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/refresh
POST /api/auth/logout
```

오류가 발생하면 response의 `code`, `message`, `requestId`를 확인합니다. 같은 `requestId`를 API 로그에서 찾으면 어느 요청에서 발생한 오류인지 추적할 수 있습니다.

Application panel의 Cookies에서는 `access_token`, `refresh_token` 존재 여부만 확인합니다. 두 cookie가 HttpOnly라 JavaScript에서 값이 보이지 않는 것은 정상입니다.

## 자주 발생하는 문제

### 메일이 실제 받은편지함에 오지 않음

개발 메일은 실제 외부 주소로 보내지 않습니다. <http://localhost:8025>의 Mailpit을 확인합니다.

### 가입은 됐지만 `EMAIL_DELIVERY_FAILED`

Mailpit이 준비되기 전에 가입 요청이 실행된 상황입니다.

```bash
docker compose ps mailpit
lsof -nP -iTCP:1025 -sTCP:LISTEN
```

Mailpit을 정상화한 뒤 같은 이메일로 재가입하지 말고 재전송을 사용합니다.

### `EMAIL_ALREADY_EXISTS`

계정이 이미 DB에 존재합니다. `users.email_verified_at`을 확인하고 미인증이면 재전송합니다.

### `RATE_LIMITED`

가입과 재전송을 짧은 시간에 반복한 경우입니다. 개발 limiter는 API process memory에 있으므로 API를 재시작하면 초기화됩니다.

### table이 없다는 Prisma 오류

```bash
pnpm db:deploy
```

### Supertest의 `listen EPERM`

제한된 sandbox가 임시 localhost socket 생성을 막은 경우입니다. 일반 로컬 terminal이나 GitHub Actions에서 다시 실행합니다.

## 전체 Docker smoke test

```bash
pnpm docker:up
```

다음을 확인합니다.

```text
http://localhost:8080/
http://localhost:8080/signup
http://localhost:8080/api/health/live
http://localhost:8080/api/health/ready
http://localhost:8025
```

종료:

```bash
pnpm docker:down
```

## 기억할 것

- 정상 흐름뿐 아니라 만료·재사용·미인증 같은 실패 흐름도 테스트해야 합니다.
- API 오류는 `requestId`로 로그와 연결합니다.
- 인증 통합 테스트는 실제 DB transaction과 cookie 흐름을 검증합니다.
- Mailpit과 DB를 먼저 준비한 뒤 Web/API를 실행해야 합니다.
