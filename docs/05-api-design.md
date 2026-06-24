# REST API 설계

## 공통 계약

Base path는 `/api`, JSON field는 camelCase다. 생성은 201, 조회·수정은 200, body 없는 삭제는 204를 사용한다. 날짜는 ISO 8601 UTC 문자열이다.

성공 응답은 payload를 `data`에 넣는다.

```json
{ "data": { "id": "uuid" } }
```

목록 응답은 pagination을 함께 제공한다.

```json
{
  "data": [{ "id": "uuid", "title": "..." }],
  "pagination": { "page": 1, "limit": 12, "totalItems": 28, "totalPages": 3 }
}
```

오류 응답은 클라이언트 분기용 안정적인 `code`와 사용자용 `message`를 구분한다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요.",
    "fieldErrors": { "email": ["올바른 이메일을 입력해 주세요."] },
    "requestId": "uuid"
  }
}
```

## 인증과 쿠키

- `access_token`: HttpOnly, Secure(운영), SameSite=Lax, Path=/, Max-Age=15분
- `refresh_token`: HttpOnly, Secure(운영), SameSite=Strict, Path=/api/auth, Max-Age=14일
- 프론트 요청은 `credentials: 'include'`를 사용한다.
- mutation은 reverse proxy가 전달한 host와 `Origin`을 검증한다.
- access JWT claim은 `sub`, `type=access`, `jti`, `iat`, `exp`; refresh는 `type=refresh`를 사용한다.

## Auth API

| Method/Path | 인증 | 요청 | 성공 | 주요 오류 |
| --- | --- | --- | --- | --- |
| POST `/auth/check-email` | 없음 | `{email}` | `{available}` | 422 |
| POST `/auth/signup` | 없음 | `{email,nickname,password}` | 사용자 요약 | 409 EMAIL_ALREADY_EXISTS |
| POST `/auth/verify-email` | 없음 | `{token}` | 인증 결과 | 400 TOKEN_INVALID/EXPIRED/USED |
| POST `/auth/resend-verification` | 없음 | `{email}` | 항상 일반화 메시지 | 429 |
| POST `/auth/login` | 없음 | `{email,password}` | 사용자 요약 + 쿠키 | 401 INVALID_CREDENTIALS, 403 EMAIL_NOT_VERIFIED |
| POST `/auth/refresh` | refresh | 없음 | 새 쿠키 | 401 SESSION_EXPIRED/REUSED |
| POST `/auth/logout` | refresh 선택 | 없음 | 204 + 쿠키 제거 | 없음 |
| GET `/auth/me` | access | 없음 | 현재 사용자 | 401 UNAUTHENTICATED |

가입과 재발송 응답은 계정 존재 여부를 과도하게 노출하지 않는다. 단, 과제의 명시적 중복 확인 UX를 위해 `check-email`은 availability를 반환하며 rate limit을 적용한다.

## Source API

### `GET /sources?page=1&limit=12`

공개 목록이다. `page` 기본 1, `limit` 기본 12·최대 50이다. 응답 item은 `id`, `title`, `originalUrl`, `sourceDomain`, `sourceType`, `summaryPreview`, `rawTextPreview`, `tags`, `author`, `commentCount`, `createdAt`, `updatedAt`만 포함한다.

### `GET /sources/:id`

공개 상세다. 목록 필드에 `rawText`, `summary`, `keyPoints`, `keywords`, `personalNote`, `extractionStatus`, `summaryStatus`, `isOwner`를 추가한다. `isOwner`는 선택적 access 인증 결과이며 비회원은 false다.

### `POST /sources`

access 인증과 이메일 인증이 필요하다.

```json
{
  "title": "문서 제목",
  "originalUrl": "https://example.com/docs",
  "sourceType": "docs",
  "rawText": "선택 입력",
  "personalNote": "선택 입력",
  "tags": ["RAG", "Agent"]
}
```

서버가 URL에서 domain을 계산한다. 생성 시 extraction status는 rawText 유무에 따라 `succeeded` 또는 `not_requested`다.

### `PATCH /sources/:id`

작성자만 가능하며 body는 생성 필드와 `summary`, `summaryStatus`, `keyPoints`, `keywords`의 부분 집합이다. 빈 body는 422다. URL 변경 시 domain을 다시 계산하며 자동 재추출하지 않는다. `summaryStatus`는 요약 적용 시 `succeeded` 또는 `demo`로 갱신하며, 실패한 AI 요청은 기존 요약 상태를 덮어쓰지 않는다.

### `DELETE /sources/:id`

작성자만 가능하다. transaction으로 종속 댓글·태그 연결을 삭제하고 204를 반환한다.

## Comment API

| Method/Path | 인증 | Body | 권한/응답 |
| --- | --- | --- | --- |
| GET `/sources/:id/comments` | 없음 | 없음 | 공개, 생성순 목록 |
| POST `/sources/:id/comments` | access | `{content}` | 인증 완료 사용자, 201 |
| PATCH `/comments/:id` | access | `{content}` | 작성자만, 200 |
| DELETE `/comments/:id` | access | 없음 | 작성자만, 204 |

댓글은 MVP에서 별도 페이징하지 않는다. 자료당 댓글이 100개를 넘으면 cursor pagination을 추가한다는 운영 기준을 둔다.

## URL 및 AI API

### `POST /tools/extract-url`

access 인증이 필요하며 아직 저장하지 않은 URL을 안전하게 미리 추출한다.

```json
{ "url": "https://example.com/article" }
```

응답은 `finalUrl`, `title`, `domain`, `sourceType`, `rawText`, `preview`, `truncated`다. 422 `URL_INVALID`, 403 `URL_BLOCKED`, 415 `CONTENT_TYPE_UNSUPPORTED`, 413 `RESPONSE_TOO_LARGE`, 504 `EXTRACTION_TIMEOUT`, 422 `EXTRACTION_FAILED`를 구분한다.

### `POST /sources/:id/summarize`

작성자만 가능하다. 저장된 `rawText`를 사용하며 request body는 없다. 성공 응답은 다음 초안이며 DB에는 즉시 저장하지 않는다.

```json
{
  "data": {
    "summary": "...",
    "keyPoints": ["..."],
    "keywords": ["..."],
    "recommendedTags": ["..."],
    "applicationIdea": "...",
    "mode": "ollama"
  }
}
```

사용자가 검토한 뒤 source PATCH로 저장한다. 배포 Mock은 `mode: "demo"`를 반환한다. 오류는 409 `SOURCE_TEXT_REQUIRED`, 503 `AI_DISABLED`/`AI_UNAVAILABLE`, 504 `AI_TIMEOUT`, 502 `AI_INVALID_RESPONSE`다.

## 상태 코드와 프론트 동작

| 상태 | 대표 code | 프론트 처리 |
| --- | --- | --- |
| 400 | TOKEN_INVALID | 화면 오류와 재발송/재시도 |
| 401 | UNAUTHENTICATED | refresh 1회 후 로그인 |
| 403 | FORBIDDEN | 권한 안내, 입력 유지 |
| 404 | SOURCE_NOT_FOUND | 404 화면 |
| 409 | EMAIL_ALREADY_EXISTS | 해당 필드 focus |
| 422 | VALIDATION_ERROR | fieldErrors 매핑 |
| 429 | RATE_LIMITED | retryAfter 안내 |
| 5xx | INTERNAL/AI/EXTRACTION 오류 | requestId와 재시도 |

## Swagger 기준

`/api/docs`는 Swagger UI, `/api/openapi.json`은 OpenAPI 3.1 문서를 제공한다. 각 endpoint에 request/response schema, cookie auth security scheme, status별 오류 예제를 정의한다. Zod schema에서 OpenAPI와 TypeScript 타입을 생성 또는 공유해 문서와 런타임 검증의 불일치를 줄인다.
