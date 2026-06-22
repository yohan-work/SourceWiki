# 07. 회원가입과 Mailpit 이메일 인증

## 회원가입 요청

회원가입 화면은 다음 API를 호출합니다.

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "nickname": "기록자",
  "password": "password123"
}
```

API 내부에서는 다음 순서로 처리합니다.

```text
Zod 입력 검증
  ↓
이메일 trim + 소문자 변환
  ↓
bcrypt cost 12로 비밀번호 hash
  ↓
users에 미인증 회원 생성
  ↓
32-byte 인증 token 생성
  ↓
token hash를 DB에 저장
  ↓
SMTP adapter로 인증 링크 발송
```

## 입력 검증을 Web과 API에서 모두 하는 이유

Web form 검증은 사용자가 빠르게 오류를 확인하기 위한 UX입니다. 하지만 API는 브라우저 외의 요청도 받을 수 있으므로 반드시 다시 검증해야 합니다.

공통 기준은 `packages/shared/src/index.ts`의 Zod schema에 있습니다.

```text
signupRequestSchema
  ├─ email
  ├─ nickname: 2~30자
  └─ password: 8~72자, UTF-8 72 byte 이하
```

## Mailpit이란?

Mailpit은 개발용 SMTP 서버이자 메일함 UI입니다.

```text
Express API
  ↓ SMTP localhost:1025
Mailpit
  ↓ Web UI
http://localhost:8025
```

개발 중에는 실제 Gmail로 메일을 보내지 않습니다. 받는 주소가 어떤 주소든 Mailpit 화면에서 확인합니다.

실행:

```bash
pnpm dev:infra
```

확인:

```text
Mailpit UI: http://localhost:8025
SMTP port:  localhost:1025
```

## 인증 링크 처리

메일 링크는 다음 형태입니다.

```text
http://localhost:3000/verify-email?token=원본토큰
```

인증 결과 화면은 token을 API에 전달합니다.

```http
POST /api/auth/verify-email

{ "token": "원본토큰" }
```

API는 token을 hash한 뒤 DB의 `token_hash`와 일치하는 행을 찾습니다.

```text
token이 없음      → TOKEN_INVALID
이미 사용됨       → TOKEN_USED
30분이 지남       → TOKEN_EXPIRED
정상              → used_at과 email_verified_at 기록
```

브라우저 URL에 token을 계속 남기지 않도록 처리 시작 후 `/verify-email`로 주소를 바꿉니다. 브라우저 history나 화면 공유로 token이 불필요하게 노출되는 것을 줄이기 위한 동작입니다.

## 재전송은 어떻게 동작하는가?

```http
POST /api/auth/resend-verification

{ "email": "user@example.com" }
```

재전송 시 기존 미사용 token은 폐기하고 새 token을 만듭니다. 예전 메일 링크와 새 메일 링크가 동시에 유효하지 않게 하기 위해서입니다.

계정 존재 여부를 과도하게 노출하지 않도록 존재하지 않는 이메일에도 일반화된 성공 메시지를 반환합니다.

## 가입은 됐는데 메일이 실패할 수 있는 이유

DB transaction 안에서 SMTP 같은 외부 통신을 오래 기다리면 DB lock이 길어질 수 있습니다. 그래서 계정과 token을 먼저 저장한 뒤 transaction 밖에서 메일을 전송합니다.

```text
DB 저장 성공
  ↓
SMTP 실패 가능
```

이 경우 계정은 이미 존재하므로 다시 가입하면 `EMAIL_ALREADY_EXISTS`가 발생합니다. Mailpit을 정상 실행한 뒤 인증 메일 재전송을 사용해야 합니다.

## rate limit

메일과 가입 endpoint를 무제한 호출하면 스팸 발송이나 계정 탐색에 악용될 수 있습니다.

| 요청 | 기본 제한 |
| --- | --- |
| 이메일 중복 확인 | 15분에 10회 |
| 회원가입 | 1시간에 5회 |
| 인증 link 처리 | 15분에 10회 |
| 인증 메일 재전송 | 1시간에 3회 |

현재 개발 환경의 limiter는 API process memory에 저장되므로 `pnpm dev`를 재시작하면 초기화됩니다.

## 기억할 것

- 개발 메일은 실제 받은편지함이 아니라 Mailpit에서 확인합니다.
- 인증 token 원문은 이메일에만 존재합니다.
- 재전송하면 이전 미사용 링크는 폐기됩니다.
- SMTP 실패 후에는 재가입이 아니라 재전송을 사용합니다.
