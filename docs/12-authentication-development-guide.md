# 인증 개발 및 확인 가이드

> 기준: Phase 3 Core CRUD 구현, Node.js 24 / pnpm 10 / PostgreSQL 17 / Mailpit

이 문서는 로컬에서 회원가입·이메일 인증·로그인 세션과 자료·댓글 CRUD를 실행하고, Web·API·메일·DB 상태를 확인하는 절차를 설명한다.

## 1. 권장 실행 방식

### Hybrid 개발 모드

코드는 host에서 실행하고 PostgreSQL과 Mailpit만 Docker로 실행한다. 화면과 API를 수정하면서 확인할 때 사용하는 기본 방식이다.

터미널 1에서 인프라와 migration을 준비한다.

```bash
cp .env.example .env # 최초 1회
pnpm dev:infra
pnpm db:deploy
pnpm db:seed # 선택: 자료·댓글 시연 데이터 생성
docker compose ps
```

`sourcewiki-db-1`과 `sourcewiki-mailpit-1`이 `healthy`인지 확인한 후 터미널 2에서 개발 서버를 실행한다.

```bash
pnpm dev
```

| 대상 | 주소 | 용도 |
| --- | --- | --- |
| Web | <http://localhost:3000> | 서비스 화면 |
| 회원가입 | <http://localhost:3000/signup> | 계정 생성 및 인증 메일 발송 |
| 로그인 | <http://localhost:3000/login> | 인증 완료 계정 로그인 |
| 자료 목록 | <http://localhost:3000/sources> | 공개 자료 목록과 페이징 |
| 자료 등록 | <http://localhost:3000/sources/new> | 인증 사용자 자료 작성 |
| API live | <http://localhost:4000/api/health/live> | API process 확인 |
| API ready | <http://localhost:4000/api/health/ready> | API와 PostgreSQL 연결 확인 |
| Swagger | <http://localhost:4000/api/docs> | API 문서 |
| Mailpit | <http://localhost:8025> | 개발용 인증 메일 확인 |

Hybrid 모드의 `/api/*` 브라우저 요청은 Next.js rewrite를 거쳐 `localhost:4000`의 Express API로 전달된다.

### 전체 Docker 모드

실제 reverse proxy 경로와 container 시작 순서를 함께 확인할 때 사용한다.

```bash
cp .env.example .env # 최초 1회
pnpm docker:up
```

| 대상 | 주소 |
| --- | --- |
| Web 및 Caddy 진입점 | <http://localhost:8080> |
| 회원가입 | <http://localhost:8080/signup> |
| 로그인 | <http://localhost:8080/login> |
| API ready | <http://localhost:8080/api/health/ready> |
| Mailpit | <http://localhost:8025> |

API container는 시작할 때 `prisma migrate deploy`를 실행한다. Web과 API는 host port로 직접 공개되지 않고 Caddy가 `/api/*`와 Web 요청을 분기한다.

종료 시 PostgreSQL 데이터는 유지한다.

```bash
pnpm docker:down
```

## 2. 회원가입과 이메일 인증 확인

1. `/signup`에서 이메일, 닉네임, 비밀번호를 입력한다.
2. <http://localhost:8025>에서 Mailpit을 연다.
3. 제목이 `[SourceLink Wiki] 이메일을 인증해 주세요`인 메일을 연다.
4. 메일의 `이메일 인증하기` 링크를 선택한다.
5. 인증 완료 화면에서 `/login`으로 이동해 로그인한다.
6. 새로고침 후에도 header에 닉네임이 유지되는지 확인한다.
7. 로그아웃 후 header가 로그인·가입 상태로 돌아오는지 확인한다.

개발 환경의 SMTP는 실제 Gmail이나 외부 메일 사업자로 전송하지 않는다. 받는 주소와 관계없이 모든 메일을 로컬 Mailpit이 수신하므로 실제 받은편지함이 아니라 `localhost:8025`에서 확인한다.

가입 요청은 계정을 DB에 먼저 저장한 뒤 메일을 전송한다. SMTP가 준비되지 않아 최초 메일 발송이 실패했더라도 같은 주소로 다시 가입하지 말고 로그인 화면 또는 인증 대기 화면의 재전송 기능을 사용한다.

기본 rate limit은 다음과 같다. 개발 중 반복 요청으로 제한에 도달하면 API 개발 서버를 재시작하거나 제한 시간이 지난 뒤 다시 확인한다.

| 요청 | 기본 제한 |
| --- | --- |
| 회원가입 | IP당 1시간에 5회 |
| 인증 메일 재전송 | IP당 1시간에 3회 |
| 로그인 | IP당 15분에 10회 |
| refresh·logout | IP당 15분에 30회 |

## 3. 자료·댓글 CRUD 확인

seed를 실행했다면 다음 계정으로 바로 로그인할 수 있다. 비밀번호는 `SEED_USER_PASSWORD`이며 기본값은 `sourcewiki-demo-password`다.

```text
archive.owner@example.test
curious.reader@example.test
```

확인 절차:

1. `/sources`에서 13개 이상 자료와 `다음` 페이지 이동을 확인한다.
2. seed 계정으로 로그인한 뒤 `/sources/new`에서 제목과 공개 HTTP(S) URL을 입력해 자료를 저장한다.
3. 상세 화면에서 댓글을 작성하고, 작성자에게만 수정·삭제 동작이 보이는지 확인한다.
4. 다른 seed 계정으로 로그인해 같은 자료 상세를 열면 자료 수정·삭제 버튼이 보이지 않아야 한다.
5. 작성자 계정으로 돌아와 자료를 삭제하면 연결 댓글도 함께 삭제된다.

관련 API는 Swagger에서 확인한다.

```bash
curl --fail http://localhost:4000/api/sources
curl --fail http://localhost:4000/api/openapi.json
```

## 4. 회원과 인증 데이터 확인

관리자 화면은 아직 없으므로 PostgreSQL CLI로 확인한다.

```bash
docker compose exec db psql -U sourcewiki -d sourcewiki
```

테이블 목록:

```sql
\dt
```

최근 가입 회원과 이메일 인증 상태:

```sql
SELECT
  id,
  email,
  nickname,
  email_verified_at,
  created_at
FROM users
ORDER BY created_at DESC;
```

`email_verified_at`이 `NULL`이면 미인증, 시간이 있으면 인증 완료 상태다. `password_hash`는 인증 진단에 필요하지 않으므로 조회하거나 외부에 공유하지 않는다.

최근 이메일 인증 토큰 상태:

```sql
SELECT
  user_id,
  expires_at,
  used_at,
  created_at
FROM email_verification_tokens
ORDER BY created_at DESC;
```

- `used_at IS NULL`이고 `expires_at`이 미래면 사용 가능한 토큰이다.
- 인증 완료 또는 재전송으로 폐기된 토큰은 `used_at`에 시간이 기록된다.
- DB에는 이메일로 전송한 원본 token이 아니라 SHA-256 hash만 저장된다.

refresh session 상태:

```sql
SELECT
  user_id,
  family_id,
  expires_at,
  revoked_at,
  replaced_by_id,
  created_at
FROM refresh_sessions
ORDER BY created_at DESC;
```

- 로그인 시 활성 session이 생성된다.
- refresh 후 이전 행은 `revoked_at`과 `replaced_by_id`가 채워지고 새 행이 생성된다.
- 로그아웃하면 현재 session의 `revoked_at`이 기록된다.

psql 종료:

```sql
\q
```

자료·댓글·태그 확인:

```sql
SELECT id, title, source_domain, user_id, created_at FROM sources ORDER BY created_at DESC LIMIT 5;
SELECT source_id, content, user_id, created_at FROM comments ORDER BY created_at DESC LIMIT 5;
SELECT name, normalized_name FROM tags ORDER BY name;
```

## 5. 쿠키와 API 확인

브라우저 개발자 도구의 `Application → Cookies`에서 다음 쿠키를 확인한다.

| 쿠키 | 수명 | Path | 역할 |
| --- | --- | --- | --- |
| `access_token` | 15분 | `/` | 일반 인증 API 요청 |
| `refresh_token` | 14일 | `/api/auth` | access 갱신과 로그아웃 |

두 쿠키는 `HttpOnly`이므로 프론트 JavaScript나 `localStorage`에서 읽을 수 없는 것이 정상이다. Network panel에서 `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`의 상태 코드와 `x-request-id`를 확인한다.

터미널에서는 health를 다음과 같이 확인한다.

```bash
curl --fail http://localhost:4000/api/health/live
curl --fail http://localhost:4000/api/health/ready
```

전체 Docker 모드에서는 port를 `8080`으로 바꾼다.

```bash
curl --fail http://localhost:8080/api/health/live
curl --fail http://localhost:8080/api/health/ready
```

## 6. 상태와 로그 확인

실행 중인 container와 health:

```bash
docker compose ps
```

PostgreSQL과 Mailpit 로그:

```bash
docker compose logs --tail=100 db
docker compose logs --tail=100 mailpit
```

전체 Docker 모드의 API와 Web 로그:

```bash
docker compose logs --tail=100 api
docker compose logs --tail=100 web
```

Hybrid 모드의 Web/API 오류는 `pnpm dev`를 실행한 터미널에서 확인한다. API 오류 응답의 `requestId`와 같은 ID를 로그에서 찾아 요청 단위로 추적한다.

## 7. 자주 발생하는 문제

### 인증 메일이 실제 받은편지함에 없음

개발 SMTP는 Mailpit을 사용한다. <http://localhost:8025>를 확인한다.

### `EMAIL_DELIVERY_FAILED`

Mailpit이 시작되지 않았거나 SMTP port가 준비되지 않은 상태다.

```bash
pnpm dev:infra
docker compose ps
lsof -nP -iTCP:1025 -sTCP:LISTEN
```

Mailpit이 healthy이고 1025가 LISTEN 상태인지 확인한 뒤 인증 메일 재전송을 사용한다.

### `EMAIL_ALREADY_EXISTS`

가입 계정이 이미 DB에 저장된 상태다. 같은 이메일로 재가입하지 말고 인증 메일 재전송 또는 기존 계정 로그인을 사용한다. 앞의 `users` 조회 SQL로 인증 상태를 확인할 수 있다.

### DB table이 없다는 오류

Hybrid 모드에서 migration이 적용되지 않은 상태다.

```bash
pnpm db:deploy
```

### port 충돌

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:4000 -sTCP:LISTEN
lsof -nP -iTCP:5432 -sTCP:LISTEN
lsof -nP -iTCP:8025 -sTCP:LISTEN
```

기존 process의 소유자와 용도를 확인한 후 종료 여부를 결정한다.

## 8. 데이터 초기화

전체 PostgreSQL volume을 삭제하는 다음 명령은 모든 로컬 회원·토큰·향후 자료 데이터를 제거한다.

```bash
docker compose down --volumes
```

단일 테스트 계정만 제거하려면 psql에서 이메일을 명시해 삭제한다. 연결된 인증 토큰과 refresh session은 cascade 삭제된다.

```sql
DELETE FROM users WHERE email = 'test@example.com';
```

데이터 초기화는 필요한 테스트 데이터가 없는지 확인한 후에만 수행한다.

## 9. 관련 코드 위치

```text
apps/web/src/app/login/                   로그인 route
apps/web/src/app/signup/                  회원가입 route
apps/web/src/app/verify-email/            인증 대기·결과 route
apps/web/src/features/auth/               폼, auth query, API 호출
apps/web/src/app/sources/                 자료 목록·등록·상세·수정 route
apps/web/src/features/sources/            자료 API, 폼, 목록, 상세 UI
apps/web/src/features/comments/           댓글 UI와 mutation
apps/web/src/lib/api/                     공통 API client와 refresh 처리
apps/api/src/modules/auth/                인증 route·service·test
apps/api/src/modules/sources/             자료 route·service·test
apps/api/src/modules/comments/            댓글 route·service
apps/api/src/openapi/                     Swagger/OpenAPI 문서
apps/api/src/integrations/mail.ts         SMTP adapter
apps/api/prisma/schema.prisma             사용자·토큰·세션·자료·댓글·태그 model
apps/api/prisma/migrations/               DB migration
packages/shared/src/index.ts              Web/API 공용 인증·CRUD schema
compose.yaml                              PostgreSQL·Mailpit·전체 stack
```
