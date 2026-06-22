# 08. JWT 로그인, refresh rotation, 보안

## 로그인 처리

로그인 API는 이메일과 비밀번호를 받습니다.

```http
POST /api/auth/login

{
  "email": "user@example.com",
  "password": "password123"
}
```

처리 순서는 다음과 같습니다.

```text
이메일로 사용자 조회
  ↓
bcrypt로 비밀번호 비교
  ↓
email_verified_at 확인
  ↓
access JWT + refresh JWT 생성
  ↓
refresh session DB 저장
  ↓
두 JWT를 HttpOnly cookie로 응답
```

이메일 인증 전 사용자는 `EMAIL_NOT_VERIFIED` 오류를 받고 로그인할 수 없습니다.

## access token과 refresh token

두 token의 역할은 다릅니다.

| token | 기본 수명 | 역할 |
| --- | --- | --- |
| access JWT | 15분 | 일반 인증 API 호출 |
| refresh JWT | 14일 | access JWT 재발급 |

access token을 짧게 유지하면 노출됐을 때 사용할 수 있는 시간이 줄어듭니다. 대신 사용자가 15분마다 로그인하지 않도록 refresh token으로 새 access token을 받습니다.

## JWT claim

JWT에는 최소 정보만 넣습니다.

```text
sub   사용자 ID
type  access 또는 refresh
jti   token 고유 ID
iat   발급 시간
exp   만료 시간
```

이메일과 닉네임은 바뀔 수 있는 값이므로 JWT에 넣지 않습니다. 현재 사용자 정보는 `/api/auth/me`가 DB에서 조회합니다.

## HttpOnly cookie

로그인 성공 시 API는 다음 cookie를 설정합니다.

```text
access_token
  HttpOnly
  SameSite=Lax
  Path=/

refresh_token
  HttpOnly
  SameSite=Strict
  Path=/api/auth
```

`HttpOnly` cookie는 브라우저 JavaScript에서 읽을 수 없습니다.

```javascript
document.cookie // JWT 원문이 보이지 않는 것이 정상
```

XSS가 발생하더라도 JavaScript가 token 값을 직접 훔치기 어렵게 하기 위한 설정입니다. 운영 HTTPS 환경에서는 `Secure=true`도 사용해야 합니다.

## refresh rotation

refresh 요청이 성공할 때마다 기존 refresh token을 계속 사용하지 않고 새 token으로 교체합니다.

```text
refresh A 사용
  ↓
A session revoked
  ↓ replaced_by_id
refresh B 생성
```

DB에서 보면 A의 `revoked_at`, `replaced_by_id`가 채워지고 B 행이 새로 생깁니다.

## 재사용 탐지

이미 B로 교체된 A가 다시 들어오면 A가 복사되었을 가능성이 있습니다.

```text
정상 사용자: B 보유
공격자:      복사한 A 재사용
```

서버는 `replaced_by_id`가 있는 폐기 token의 재사용을 감지하면 같은 `family_id`의 활성 session을 모두 폐기합니다. 이후 정상 사용자도 다시 로그인해야 합니다.

## 로그아웃

로그아웃은 화면 상태만 지우는 것이 아닙니다.

```text
현재 refresh session revoked
  +
access_token cookie 제거
  +
refresh_token cookie 제거
```

잘못되거나 이미 만료된 refresh cookie가 있어도 로그아웃은 204로 종료하도록 idempotent하게 처리합니다.

## Origin 검증과 CSRF

브라우저는 cookie를 자동으로 요청에 포함합니다. 공격 사이트가 사용자의 cookie를 이용해 mutation을 보내지 못하도록 GET 이외 요청의 `Origin`을 검사합니다.

```text
개발 허용 Origin: http://localhost:3000
다른 Origin:       ORIGIN_NOT_ALLOWED
```

SameSite cookie와 Origin 검증을 함께 사용해 CSRF 위험을 줄입니다.

## 비밀키와 환경변수

access와 refresh는 서로 다른 secret으로 서명합니다.

```env
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ISSUER=sourcewiki-api
JWT_AUDIENCE=sourcewiki-web
```

`.env.example` 값은 로컬 개발 전용입니다. 운영에서는 충분히 긴 random secret으로 반드시 교체해야 합니다.

## 기억할 것

- JWT는 암호화된 DB가 아니라 서명된 token입니다. 민감정보를 claim에 넣지 않습니다.
- access는 짧게, refresh는 DB session과 함께 관리합니다.
- refresh는 사용할 때마다 회전합니다.
- cookie 인증은 CSRF 방어와 함께 구현해야 합니다.
