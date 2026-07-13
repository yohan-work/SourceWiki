# 18. API 계약 사전

## 먼저 생각해 보기

프론트엔드에서 endpoint URL만 안다고 API를 이해한 것일까? 아니다. 요청 형태, 인증, 성공/실패 응답, 화면 후속 동작이 모두 계약이다.

모든 응답은 보통 `{ data, meta: { requestId } }` 형태다. 오류는 `{ error: { code, message, requestId, fieldErrors? } }` 형태다.

## Auth 계약

| Endpoint | 요청 | 인증 | 성공 | 핵심 실패 |
| --- | --- | --- | --- | --- |
| `POST /api/auth/check-email` | email | 없음 | 사용 가능 여부 | 422 |
| `POST /api/auth/signup` | email/nickname/password | 없음 | 201 User | 409 중복, 503 SMTP |
| `POST /api/auth/verify-email` | token | 없음 | 인증 완료 | 400 invalid/used/expired |
| `POST /api/auth/resend-verification` | email | 없음 | 재전송 안내 | 503 SMTP |
| `POST /api/auth/login` | email/password | 없음 | User + Set-Cookie | 401/403 |
| `POST /api/auth/refresh` | refresh cookie | 쿠키 | 204 + 새 쿠키 | 401 |
| `POST /api/auth/logout` | refresh cookie 선택 | 없음 | 204 + 쿠키 삭제 | 없음(idempotent) |
| `GET /api/auth/me` | 없음 | access cookie | 현재 User | 401 |

## 자료·상호작용 계약

| Endpoint 그룹 | 읽기/변경 | 인증 기준 | 프론트 시작점 |
| --- | --- | --- | --- |
| `GET /api/sources`, `/:id`, `/:id/comments` | 읽기 | 선택 access cookie | `sourceApi.list/detail/comments` |
| `POST/PATCH/DELETE /api/sources` | 자료 변경 | 로그인 + 이메일 인증 + 작성자 | `SourceForm`, detail view |
| `POST/DELETE /:id/like` | 좋아요 | 로그인 + 이메일 인증 | source detail |
| `POST /:id/comments`, `PATCH/DELETE /api/comments/:id` | 댓글 변경 | 로그인 + 이메일 인증 + 작성자 | `CommentsPanel` |
| `POST /:id/files`, `DELETE /api/files/:id` | 파일 변경 | 로그인 + 이메일 인증 + 작성자 | `SourceFilesPanel` |
| `POST /api/tools/extract-url` | URL 본문 추출 | 로그인 + 이메일 인증 | `SourceForm` |
| `PATCH /api/users/me` | 프로필 | 로그인 + 이메일 인증 | `ProfileForm` |

`source.routes.ts`가 자료 route의 middleware 순서를 보여 준다. 예를 들어 쓰기 route는 `authenticate` → `requireVerifiedUser` → body schema 검증 → service 순서다. 이 순서는 “누구인지 먼저 확인하고, 인증된 사용자만 입력을 처리한다”는 정책이다.

## 공통 오류를 화면으로 연결하기

| API 상태 | `ApiError` 의미 | 프론트의 적절한 처리 |
| --- | --- | --- |
| 401 | 비로그인/세션 만료 | refresh 시도 또는 로그인 상태 표시 |
| 403 | 이메일 미인증/권한 없음 | 인증 안내 또는 작업 금지 |
| 404 | 자료·경로 없음 | not-found 화면/메시지 |
| 409 | 중복·충돌 | 중복 입력 안내 |
| 422 | schema 검증 실패 | `fieldErrors`를 input에 표시 |
| 503 | SMTP/AI 등 의존성 실패 | 재시도·대체 행동 안내 |

## 계약을 읽는 방법

1. shared package의 request/response type과 Zod schema를 본다.
2. Web feature API에서 endpoint/method/body를 본다.
3. backend router의 middleware와 status code를 본다.
4. service에서 실제 업무 규칙·DB 변경을 본다.
5. 컴포넌트의 `onSuccess`/`onError`에서 화면 변화를 확인한다.

## 자기 점검

`POST /api/sources`가 왜 201이고 `DELETE`가 왜 204인지 설명해 보라. 201은 새 리소스가 생성됐음을, 204는 성공했지만 응답 body가 없음을 뜻한다.
