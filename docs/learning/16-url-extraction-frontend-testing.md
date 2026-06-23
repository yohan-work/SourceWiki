# 16. URL 추출 프론트엔드 흐름과 테스트

## 등록 화면에서 달라진 점

Phase 3의 자료 등록 화면은 사용자가 제목, URL, 본문을 직접 입력하는 구조였습니다.

Phase 4에서는 여기에 `본문 가져오기` 버튼이 추가됐습니다.

```text
/sources/new
  ↓
원본 URL 입력
  ↓
본문 가져오기 클릭
  ↓
API가 URL에서 제목과 본문 추출
  ↓
폼에 값 자동 입력
  ↓
사용자가 검토·수정
  ↓
자료 저장
```

중요한 점은 자동 추출이 필수가 아니라는 것입니다. 추출이 실패해도 사용자는 제목과 URL을 직접 입력해서 저장할 수 있습니다.

## 프론트엔드 파일 위치

Phase 4에서 프론트엔드 쪽으로 주로 바뀐 파일은 다음과 같습니다.

```text
apps/web/src/features/sources/source-api.ts
apps/web/src/features/sources/source-form.tsx
apps/web/src/app/globals.css
```

`source-api.ts`는 API 호출 함수를 모아둔 파일입니다.

```text
sourceApi.extractUrl(...)
```

`source-form.tsx`는 등록과 수정 폼을 함께 담당합니다. Phase 4의 `본문 가져오기` UI는 새 자료 등록 화면에서만 보입니다.

```tsx
{!id ? (
  <div className="extract-panel">
    ...
  </div>
) : null}
```

여기서 `id`가 있으면 수정 화면이고, `id`가 없으면 새 등록 화면입니다.

## API 호출 흐름

프론트엔드에서 추출 요청은 React Query mutation으로 처리합니다.

```text
사용자가 버튼 클릭
  ↓
extractMutation.mutate()
  ↓
sourceApi.extractUrl({ url })
  ↓
POST /api/tools/extract-url
  ↓
성공하면 setValue로 form 값 채움
  ↓
실패하면 setError로 오류 표시
```

저장 mutation과 추출 mutation은 분리되어 있습니다.

```text
extractMutation   본문 미리 가져오기
mutation          자료 생성 또는 수정
```

이렇게 분리한 이유는 추출 실패가 저장 실패가 아니기 때문입니다.

## 성공했을 때 채워지는 값

추출이 성공하면 API 응답의 `data`를 사용해 폼 값을 채웁니다.

```text
originalUrl  finalUrl
title        title이 있을 때만 자동 입력
sourceType   추정 sourceType
rawText      정제 본문
```

사용자는 자동으로 채워진 값을 그대로 저장할 수도 있고, 저장 전에 수정할 수도 있습니다.

`preview`는 폼 값을 채우는 데 쓰는 것이 아니라 화면에 짧게 보여주는 용도입니다.

```text
domain
preview
truncated
```

`truncated`가 true이면 긴 본문이 100,000자에서 잘렸다는 안내를 보여줍니다.

## 실패했을 때 중요한 UX

URL 추출은 실패할 수 있습니다. 오히려 실패가 자연스러운 기능입니다.

실패할 수 있는 이유는 많습니다.

```text
private IP 또는 localhost
지원하지 않는 Content-Type
본문이 너무 짧음
응답이 너무 큼
사이트 응답 지연
JS 렌더링 필요
로그인 또는 CAPTCHA 필요
```

그래서 실패 UX의 핵심은 다음입니다.

```text
기존 입력을 지우지 않는다.
오류를 화면에 남긴다.
사용자가 수동으로 본문을 붙여넣을 수 있게 둔다.
저장 버튼은 계속 사용할 수 있게 둔다.
```

현재 구현은 추출 실패 시 `setExtractPreview(null)`로 preview만 지우고, URL/title/rawText 같은 사용자의 기존 입력은 유지합니다.

## 왜 수정 화면에는 버튼이 없는가

Phase 4의 추출 API는 저장 전 preview 기능입니다. 그래서 `/sources/new`에 먼저 연결했습니다.

수정 화면에서 URL을 바꿨다고 자동 재추출하지 않습니다.

```text
URL 변경
  ↓
domain은 저장 시 다시 계산
  ↓
rawText는 사용자가 직접 수정
```

수정 화면 재추출은 나중에 별도 UX로 추가할 수 있습니다. 자동으로 본문을 덮어쓰면 기존 사용자가 편집한 내용이 사라질 수 있기 때문에 조심해야 합니다.

## 인증 조건

`POST /api/tools/extract-url`은 인증된 사용자만 호출할 수 있습니다.

API route에는 다음 middleware가 붙어 있습니다.

```text
authenticate
requireVerifiedUser
validateBody(extractUrlRequestSchema)
```

즉 다음 조건을 만족해야 합니다.

```text
로그인되어 있음
이메일 인증 완료
요청 body가 schema를 통과함
```

프론트엔드 등록 화면도 기존과 같이 로그인하지 않은 사용자는 `/login`으로 보냅니다.

## OpenAPI 문서에서 확인하기

새 endpoint는 OpenAPI 문서에도 추가됐습니다.

```text
apps/api/src/openapi/document.ts
```

Swagger UI에서는 다음 주소에서 확인할 수 있습니다.

```text
http://localhost:4000/api/docs
```

OpenAPI JSON은 다음 주소입니다.

```text
http://localhost:4000/api/openapi.json
```

문서 테스트는 이 path가 빠지지 않았는지 확인합니다.

```text
apps/api/src/openapi/document.test.ts
```

## 테스트가 보는 것

Phase 4에서 추가된 핵심 테스트는 extractor unit test입니다.

```text
apps/api/src/modules/tools/url-extractor.test.ts
```

이 테스트는 실제 인터넷에 접속하지 않습니다. DNS와 HTTP 요청을 mock합니다.

이유는 간단합니다.

```text
외부 사이트는 느릴 수 있음
응답이 바뀔 수 있음
네트워크가 막힐 수 있음
테스트가 불안정해짐
```

대신 테스트 안에서 원하는 응답을 직접 만들어 시나리오를 검증합니다.

```text
public HTML 성공
redirect 재검증
private IP 차단
unsupported content type 실패
oversized body 실패
```

## 수동 smoke 방법

개발자가 실제 화면에서 빠르게 확인하려면 다음 순서로 보면 됩니다.

```bash
pnpm dev:infra
pnpm db:deploy
pnpm db:seed
pnpm dev
```

그다음 브라우저에서 확인합니다.

```text
1. http://localhost:3000/login 접속
2. seed 계정으로 로그인
3. /sources/new 이동
4. 공개 HTML URL 입력
5. 본문 가져오기 클릭
6. 제목과 정제 본문이 채워지는지 확인
7. 저장 후 상세 페이지로 이동하는지 확인
```

실패 흐름도 확인해야 합니다.

```text
http://127.0.0.1:4000
http://localhost:3000
https://example.com/favicon.ico
```

이런 URL은 보안 검증이나 Content-Type 제한 때문에 실패할 수 있습니다. 실패했을 때 입력이 유지되고 수동 저장이 가능한지 봅니다.

## 자주 헷갈리는 점

### 추출하면 DB에 저장되나요?

아니요. 추출 API는 preview만 반환합니다. DB 저장은 사용자가 `자료 저장`을 눌렀을 때만 일어납니다.

### `rawTextPreview`는 어디서 만들어지나요?

자료 저장 시 API service가 `rawText`에서 목록용 preview를 만듭니다. 추출 API의 `preview`는 등록 화면에서 즉시 보여주는 미리보기입니다.

### AI 요약도 같이 되나요?

아니요. Phase 4는 URL 추출까지만 담당합니다. AI 요약은 Phase 5에서 `POST /sources/:id/summarize` 흐름으로 추가할 예정입니다.

### 왜 브라우저에서 직접 fetch하지 않나요?

브라우저에서 외부 사이트를 직접 fetch하면 CORS에 막히는 경우가 많습니다. 그리고 보안 검증, body 제한, HTML 정제는 서버에서 일관되게 처리해야 합니다.

### 왜 실패해도 저장 버튼을 막지 않나요?

URL 추출은 편의 기능입니다. 어떤 사이트는 기술적으로 추출할 수 없지만, 사용자가 직접 본문을 붙여넣어 자료를 저장할 수 있어야 합니다.

## 기억할 것

- `본문 가져오기`는 새 자료 등록 화면에서만 보입니다.
- 추출 mutation과 저장 mutation은 서로 다른 작업입니다.
- 성공하면 폼 값을 채우지만, 사용자가 최종 검토하고 저장합니다.
- 실패해도 입력을 잃지 않아야 합니다.
- 테스트는 외부 인터넷이 아니라 mock DNS/HTTP로 안정적으로 검증합니다.
- Phase 4는 URL 추출이고, AI 요약은 Phase 5입니다.
