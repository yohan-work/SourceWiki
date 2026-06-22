# 06. 사용자 DB 모델과 Prisma migration

## 인증에 DB가 필요한 이유

로그인 기능은 사용자가 존재하는지만 확인하면 끝나지 않습니다. 다음 정보를 계속 기억해야 합니다.

```text
누가 가입했는가?
이메일 인증을 완료했는가?
어떤 인증 링크가 유효한가?
어떤 refresh session이 활성 상태인가?
```

그래서 Phase 2에서는 세 개의 table을 추가했습니다.

```text
users
email_verification_tokens
refresh_sessions
```

## users table

`users`는 계정의 기준 데이터입니다.

| 필드 | 의미 |
| --- | --- |
| `id` | 사용자 UUID, JWT의 `sub` |
| `email` | 정규화된 로그인 이메일 |
| `password_hash` | bcrypt로 변환한 비밀번호 |
| `nickname` | 화면에 표시할 이름 |
| `email_verified_at` | 이메일 인증 완료 시간 |
| `created_at`, `updated_at` | 생성·변경 시간 |

이메일은 앞뒤 공백을 제거하고 소문자로 바꾼 뒤 저장합니다.

```text
  USER@Example.com  → user@example.com
```

DB에도 `UNIQUE` 제약을 두기 때문에 동시에 같은 이메일로 가입 요청이 들어와도 마지막에 DB가 중복을 막습니다.

## 비밀번호는 왜 hash로 저장하는가?

비밀번호 원문을 저장하면 DB가 노출됐을 때 모든 계정의 비밀번호가 바로 드러납니다.

```text
사용자 입력 password123
  ↓ bcrypt cost 12
$2b$12$... 형태의 password_hash
```

로그인할 때도 hash를 원래 비밀번호로 되돌리지 않습니다. 입력값과 저장된 hash가 같은 비밀번호에서 만들어졌는지 bcrypt가 비교합니다.

## email_verification_tokens table

인증 링크는 한 번만 사용할 수 있고 30분 후 만료되어야 합니다.

| 필드 | 의미 |
| --- | --- |
| `user_id` | 어느 사용자의 token인지 연결 |
| `token_hash` | 원본 token의 SHA-256 hash |
| `expires_at` | 30분 만료 시간 |
| `used_at` | 사용 또는 폐기 시간 |

메일에는 원본 token이 들어가지만 DB에는 hash만 저장합니다.

```text
메일 URL: 원본 token
DB:       SHA-256(token)
```

DB가 노출되어도 공격자가 DB 값만으로 인증 링크를 바로 만들지 못하게 하기 위한 구조입니다.

## refresh_sessions table

refresh JWT는 로그인 상태를 14일 동안 이어가기 위한 token입니다. 단순히 JWT 서명만 확인하지 않고 DB session과 함께 검증합니다.

| 필드 | 의미 |
| --- | --- |
| `user_id` | session 소유자 |
| `family_id` | 같은 로그인에서 회전한 session 묶음 |
| `token_hash` | refresh JWT hash |
| `expires_at` | session 만료 시간 |
| `revoked_at` | 로그아웃·회전·재사용 탐지로 폐기된 시간 |
| `replaced_by_id` | 회전 후 새 session ID |

`family_id` 덕분에 이전 refresh token이 다시 사용되면 같은 로그인에서 파생된 session 전체를 폐기할 수 있습니다.

## Prisma schema와 migration의 차이

`schema.prisma`는 애플리케이션이 원하는 DB 구조를 선언합니다.

```text
apps/api/prisma/schema.prisma
```

migration SQL은 실제 DB를 그 구조로 변경하는 기록입니다.

```text
apps/api/prisma/migrations/20260622000000_add_auth/migration.sql
```

코드만 받은 새 환경에서는 migration을 적용해야 table이 생깁니다.

```bash
pnpm db:deploy
```

Prisma client 코드는 schema를 기준으로 생성합니다.

```bash
pnpm db:generate
```

## 데이터 확인

Docker의 PostgreSQL에 접속합니다.

```bash
docker compose exec db psql -U sourcewiki -d sourcewiki
```

회원 확인:

```sql
SELECT id, email, nickname, email_verified_at, created_at
FROM users
ORDER BY created_at DESC;
```

인증 token 확인:

```sql
SELECT user_id, expires_at, used_at, created_at
FROM email_verification_tokens
ORDER BY created_at DESC;
```

session 확인:

```sql
SELECT user_id, family_id, expires_at, revoked_at, replaced_by_id
FROM refresh_sessions
ORDER BY created_at DESC;
```

## 기억할 것

- schema 변경과 실제 DB 변경은 다르므로 migration을 적용해야 합니다.
- 비밀번호와 token 원문은 DB에 저장하지 않습니다.
- `email_verified_at`이 `NULL`이면 미인증 사용자입니다.
- refresh session은 JWT를 강제로 폐기하고 재사용을 탐지하기 위해 필요합니다.
