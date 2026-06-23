# 12. Source·Comment API와 권한 검증

## Phase 3 API의 큰 구조

Phase 3 API는 자료와 댓글을 REST endpoint로 제공합니다.

```text
GET    /api/sources
POST   /api/sources
GET    /api/sources/:id
PATCH  /api/sources/:id
DELETE /api/sources/:id

GET    /api/sources/:id/comments
POST   /api/sources/:id/comments
PATCH  /api/comments/:id
DELETE /api/comments/:id
```

목록·상세·댓글 조회는 공개 API입니다. 생성·수정·삭제는 로그인과 이메일 인증이 필요합니다.

## 공개 조회와 optional auth

자료 상세와 댓글 목록은 비회원도 볼 수 있어야 합니다. 하지만 로그인한 사용자가 보면 `isOwner`를 계산해야 합니다.

```text
비회원 조회
  ↓
isOwner: false

작성자 조회
  ↓ access cookie 확인
  ↓
isOwner: true
```

이를 위해 `optionalAuthenticate`는 access cookie가 있으면 사용자 ID를 넣고, 없거나 만료됐으면 공개 조회를 계속 진행합니다.

주의할 점은 optional auth가 보호 장치가 아니라는 것입니다. 공개 조회에서 UI 편의를 위해 현재 사용자를 알아내는 역할만 합니다.

## mutation은 requireVerifiedUser

자료와 댓글을 쓰는 endpoint는 다음 순서로 보호합니다.

```text
access cookie 인증
  ↓
DB에서 user 확인
  ↓
email_verified_at 존재 확인
  ↓
service 실행
```

로그인 token만 믿지 않고 DB의 `email_verified_at`을 다시 확인하는 이유는 사용자의 인증 상태가 DB의 현재 값이기 때문입니다.

## 소유권은 service query에서 검증

수정·삭제 버튼은 프론트엔드에서도 작성자에게만 보여줍니다. 그러나 최종 권한은 API service에서 검증해야 합니다.

```text
client의 isOwner
  ↓ UI 편의

service의 userId 조건
  ↓ 보안 경계
```

자료 수정은 먼저 `source.userId`를 확인하고, 실제 update/delete도 작성자 ID 조건과 함께 실행합니다. 댓글도 같은 방식으로 `comment.userId`를 기준으로 검증합니다.

## Zod와 공유 API 계약

요청과 응답의 기본 형태는 `packages/shared`에 둡니다.

```text
sourceCreateRequestSchema
sourceUpdateRequestSchema
commentRequestSchema
sourceListResponseSchema
sourceDetailResponseSchema
commentListResponseSchema
```

Web form과 API validation이 같은 schema를 사용하면 입력 제한이 서로 어긋날 가능성이 줄어듭니다.

예를 들어 URL은 공개 HTTP(S) URL이어야 합니다.

```text
허용: https://docs.example.com/path
거부: http://127.0.0.1/private
거부: https://user:pass@example.com
```

Phase 4 URL 추출에서는 DNS와 redirect 검증이 더 필요하지만, Phase 3에서는 저장 가능한 URL 입력의 1차 경계를 schema로 둡니다.

## OpenAPI 문서

Phase 3에서는 API 문서를 코드와 함께 제공합니다.

```text
GET /api/openapi.json
GET /api/docs
```

OpenAPI 문서는 공유 Zod schema를 JSON Schema로 변환해 component에 넣습니다. 그래서 API 계약이 바뀌면 문서도 함께 갱신해야 합니다.

Swagger UI는 브라우저에서 직접 렌더링 확인이 필요합니다. Express 전역 `helmet()`의 기본 CSP가 Swagger UI의 inline script/style과 충돌할 수 있기 때문입니다. `curl /api/docs` 성공은 HTML 응답이 있다는 뜻이지, 화면이 정상 렌더링된다는 뜻은 아닙니다.

## 오류 응답

API 오류는 기존 Phase 2 계약을 따릅니다.

```text
error.code
error.message
error.requestId
error.fieldErrors
```

body validation은 field별 오류를 `fieldErrors`에 넣습니다. query validation도 같은 계약을 따르는 것이 좋지만, 현재 `validateQuery`는 fieldErrors를 싣지 않아 보완 여지가 있습니다.

## 기억할 것

- 공개 조회와 보호 mutation의 경계를 endpoint마다 분명히 나눕니다.
- optional auth는 UI 편의를 위한 것이지 권한 검증이 아닙니다.
- 작성자 권한은 service에서 DB 조건으로 최종 검증합니다.
- 공유 Zod schema는 Web과 API 계약의 기준입니다.
- OpenAPI 문서는 endpoint 추가만큼 실제 브라우저 렌더링도 확인해야 합니다.
