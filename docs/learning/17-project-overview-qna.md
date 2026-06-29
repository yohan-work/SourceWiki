# 프로젝트 전체 구조와 데이터 흐름

이 문서는 SourceWiki를 전체적으로 이해하기 위한 종합 정리입니다. 앞선 learning 문서들이 phase별 구현 과정을 설명한다면, 이 문서는 프로젝트가 어떤 기술로 구성되어 있고 사용자의 요청이 Web, API, DB, 외부 서비스 사이를 어떻게 이동하는지 한 번에 잡기 위한 문서입니다.

## 0. 이 문서를 읽는 방법

처음에는 세 가지 질문을 가지고 읽으면 이해가 쉽습니다.

1. 사용자의 브라우저 요청은 어디로 들어가고 어디까지 이동하는가?
2. 로그인 정보와 권한은 프론트와 백엔드 중 어디에서 판단하는가?
3. 자료, 댓글, 태그, 파일 같은 데이터는 어떤 테이블 관계로 저장되는가?

SourceWiki는 `Next.js 화면 + Express API + PostgreSQL DB`를 분리해서 구성한 프로젝트입니다. 프론트엔드는 사용자의 입력과 화면 상태를 관리하고, 백엔드는 인증, 권한, 데이터 검증, DB 저장을 담당합니다. 두 영역은 `packages/shared`의 Zod schema를 공유해 같은 데이터 계약을 사용합니다.

## 0.1 핵심 개념 지도

```text
사용자 화면
  |
  | React component, form, TanStack Query
  v
Next.js Web
  |
  | apiFetch 또는 serverApiFetch
  v
Express API
  |
  | middleware: requestId, logger, helmet, cookie, origin, validation
  v
Route
  |
  | service: 비즈니스 로직, 권한 검증
  v
Prisma
  |
  v
PostgreSQL
```

이 흐름에서 중요한 원칙은 "사용자 경험은 프론트에서 돕고, 실제 신뢰 판단은 서버에서 한다"입니다. 예를 들어 작성자가 아니면 프론트에서 수정 버튼을 숨기지만, API도 DB를 조회해 작성자 여부를 다시 확인합니다.

## 1. 프로젝트 한 줄 설명

SourceWiki는 AI 기술 자료의 URL을 저장하고, 서버가 본문을 추출한 뒤, 사용자가 요약과 메모를 더해 공개 지식 아카이브로 축적하는 웹 서비스입니다.

일반 게시판과의 가장 큰 차이는 글 작성의 시작점이 자유 본문이 아니라 원본 URL이라는 점입니다. 사용자는 URL, 제목, 정제 본문, 요약, 핵심 포인트, 키워드, 태그, 개인 메모를 하나의 자료 단위로 관리합니다.

## 2. 사용 기술 요약

| 영역 | 사용 기술 | 역할 |
| --- | --- | --- |
| Monorepo | pnpm workspace | Web, API, shared package를 한 저장소에서 관리 |
| Frontend | Next.js App Router, React | 화면, 라우팅, SSR 데이터 로딩, 사용자 인터랙션 |
| Frontend state | TanStack Query | 로그인 사용자, 자료 목록, 상세, 댓글 같은 서버 상태 캐싱 |
| Form | React Hook Form, Zod resolver | 입력값 검증과 폼 에러 표시 |
| Backend | Express | REST API, 인증, 권한 검증, 비즈니스 로직 처리 |
| DB ORM | Prisma | PostgreSQL schema, migration, DB query |
| Database | PostgreSQL | 사용자, 세션, 자료, 댓글, 태그, 파일 메타데이터 저장 |
| Shared schema | TypeScript, Zod | Web과 API가 같은 request/response 계약 사용 |
| Auth | JWT, HttpOnly Cookie, bcrypt | 로그인, access/refresh token, 비밀번호 해시 |
| Mail | Nodemailer, Mailpit | 이메일 인증 메일 발송과 로컬 수신 확인 |
| Proxy | Caddy, Next rewrite | Web/API를 같은 origin으로 노출 |
| Docs | Swagger/OpenAPI | API 문서 제공 |
| CI/CD | GitHub Actions, Docker, GHCR, EC2 | 테스트, 이미지 빌드, 운영 배포 |
| AI | Ollama 또는 demo mode | 원문 기반 요약, 질문 추천, 자료 대화 |

## 2.1 주요 용어

| 용어 | 이 프로젝트에서의 의미 |
| --- | --- |
| Web | 사용자가 보는 Next.js 앱 |
| API | Express로 만든 REST API 서버 |
| Source | 일반 게시판의 게시글에 해당하는 자료 단위 |
| rawText | URL에서 추출하거나 사용자가 직접 붙여넣은 정제 본문 |
| summary | rawText를 바탕으로 만든 요약 또는 사용자가 직접 작성한 요약 |
| Tag | 자료를 분류하기 위한 키워드 |
| SourceTag | Source와 Tag의 다대다 연결 테이블 |
| Access token | 짧게 유지되는 API 인증용 JWT |
| Refresh token | access token을 재발급하기 위한 긴 수명의 JWT |
| Session family | refresh token 회전과 재사용 감지를 위한 묶음 |
| DTO | DB row를 화면/API 응답에 맞게 바꾼 객체 |

## 3. 저장소 구조

```text
SourceWiki
├─ apps/web
│  ├─ src/app                 Next.js route
│  ├─ src/features/auth       로그인, 회원가입, me query
│  ├─ src/features/sources    자료 목록, 작성, 상세, AI UI
│  ├─ src/features/comments   댓글 UI
│  ├─ src/features/files      파일 첨부 UI
│  └─ src/lib/api             공통 API client
├─ apps/api
│  ├─ src/app.ts              Express app 구성
│  ├─ src/modules/auth        회원가입, 인증, 로그인, refresh
│  ├─ src/modules/sources     자료 CRUD, 요약, 대화, 좋아요
│  ├─ src/modules/comments    댓글 수정, 삭제, service
│  ├─ src/modules/tools       URL 본문 추출
│  ├─ src/modules/files       파일 업로드와 다운로드
│  ├─ src/openapi             Swagger/OpenAPI 문서
│  └─ prisma/schema.prisma    DB 모델
├─ packages/shared
│  └─ src/index.ts            Web/API 공용 Zod schema와 TypeScript type
├─ compose.yaml               로컬 전체 Docker stack
├─ compose.production.yaml    운영 Docker stack
├─ infra/Caddyfile            로컬 reverse proxy
└─ .github/workflows          CI와 Deploy workflow
```

핵심은 `apps/web`, `apps/api`, `packages/shared`가 분리되어 있지만 같은 repository와 같은 package manager로 관리된다는 점입니다.

## 3.1 기능별 코드 지도

처음 코드를 따라갈 때는 파일을 무작정 열기보다 기능 단위로 보는 것이 좋습니다.

| 기능 | Web | API | Shared/DB |
| --- | --- | --- | --- |
| 회원가입 | `apps/web/src/features/auth/signup-form.tsx` | `apps/api/src/modules/auth/auth.routes.ts`, `auth.service.ts` | `signupRequestSchema`, `User`, `EmailVerificationToken` |
| 로그인 | `apps/web/src/features/auth/login-form.tsx`, `use-me-query.ts` | `auth.routes.ts`, `auth.service.ts`, `jwt.ts` | `loginRequestSchema`, `RefreshSession` |
| 공통 API 호출 | `apps/web/src/lib/api/api-client.ts` | `middleware/error-handler.ts` | `apiErrorResponseSchema` |
| 자료 목록 | `apps/web/src/app/sources/page.tsx`, `source-list.tsx` | `source.routes.ts`, `source.service.ts` | `sourceListQuerySchema`, `Source` |
| 자료 작성/수정 | `source-form.tsx` | `source.routes.ts`, `source.service.ts` | `sourceCreateRequestSchema`, `sourceUpdateRequestSchema` |
| 댓글 | `features/comments/comments-panel.tsx` | `comment.routes.ts`, `comment.service.ts` | `commentRequestSchema`, `Comment` |
| URL 추출 | `source-form.tsx` | `tools.routes.ts`, `url-extractor.ts` | `extractUrlRequestSchema` |
| AI 요약/대화 | `source-detail-view.tsx`, `source-ai-proxy.ts` | `source-summarizer.ts` | `summarizeSourceResponseSchema`, `sourceChatResponseSchema` |
| 파일 업로드 | `source-form.tsx`, `source-files-panel.tsx` | `files/multipart.ts`, `file.service.ts` | `UploadedFile` |
| API 문서 | 해당 없음 | `openapi/document.ts`, `openapi.routes.ts` | shared schema 기반 계약 |

이 표를 기준으로 보면 화면, API route, service, schema, DB model이 어떻게 이어지는지 빠르게 찾을 수 있습니다.

## 4. 전체 요청 흐름

로컬 개발 모드는 보통 Web과 API는 host Node.js에서 실행하고, PostgreSQL과 Mailpit만 Docker로 실행합니다.

```text
Browser
  |
  | http://localhost:3000
  v
Next.js Web
  |
  | /api/* rewrite
  v
Express API
  |
  | Prisma
  v
PostgreSQL
```

전체 Docker 모드에서는 Caddy가 단일 진입점이 됩니다.

```text
Browser
  |
  | http://localhost:8080
  v
Caddy
  |-- /api/*  -> Express API -> PostgreSQL
  `-- others  -> Next.js Web
```

이 구조 덕분에 브라우저 입장에서는 Web과 API가 같은 origin처럼 동작합니다. 쿠키 인증과 CSRF 방어를 설명할 때 중요한 지점입니다.

## 4.1 요청 처리 계층

Express API는 `apps/api/src/app.ts`에서 공통 middleware와 route를 조립합니다.

```text
request
  -> requestId
  -> requestLogger
  -> helmet
  -> express.json
  -> cookieParser
  -> verifyOrigin
  -> feature router
  -> notFound
  -> errorHandler
```

각 계층의 역할은 다음과 같습니다.

- `requestId`: 모든 응답과 로그를 추적할 수 있는 ID를 부여합니다.
- `requestLogger`: 요청 단위 로그를 남깁니다.
- `helmet`: 기본 보안 header를 설정합니다.
- `express.json`: JSON body를 읽고 크기를 제한합니다.
- `cookieParser`: HttpOnly cookie에 담긴 token을 읽을 수 있게 합니다.
- `verifyOrigin`: cookie 기반 mutation 요청에서 허용된 origin인지 확인합니다.
- feature router: auth, sources, comments, files, users 같은 기능별 API입니다.
- `errorHandler`: 오류를 공통 JSON 형태로 변환합니다.

## 4.2 Web에서 API를 부르는 두 방식

Web에는 API 호출 방식이 두 가지 있습니다.

| 호출 위치 | 함수 | 특징 |
| --- | --- | --- |
| Client Component | `apiFetch()` | 브라우저에서 호출, cookie 포함, 401 refresh 재시도 |
| Server Component | `serverApiFetch()` | Next 서버에서 호출, incoming cookie를 API로 전달 |

목록/상세 페이지는 서버 컴포넌트에서 초기 데이터를 먼저 가져와 TanStack Query cache에 채웁니다. 이후 클라이언트 컴포넌트는 같은 query key를 사용해 이어받습니다. 이 구조는 첫 화면 로딩을 빠르게 하고, 이후 사용자 상호작용에서는 클라이언트 캐시를 활용하게 해줍니다.

## 4.3 데이터가 이동하면서 바뀌는 형태

자료 작성 예시로 보면 데이터는 다음 형태로 이동합니다.

```text
FormValues
  -> SourceCreateRequest
  -> Prisma create input
  -> Source row
  -> SourceDetail DTO
  -> SourceDetailResponse
  -> TanStack Query cache
  -> React UI
```

각 단계의 의미는 다음과 같습니다.

| 단계 | 설명 |
| --- | --- |
| `FormValues` | 화면에서 다루기 쉬운 문자열 중심 값 |
| `SourceCreateRequest` | API로 보낼 수 있도록 정리된 request body |
| Prisma create input | DB relation 저장을 위해 tags 연결 등이 포함된 형태 |
| `Source row` | PostgreSQL에 저장된 실제 데이터 |
| DTO | DB row에서 passwordHash, 내부 필드 등을 제외하고 화면에 필요한 형태로 가공한 객체 |
| API response | `{ data, meta }` 구조로 requestId와 함께 내려가는 응답 |
| Query cache | 프론트가 같은 데이터를 다시 쓰기 위해 저장하는 서버 상태 |

이 구조를 두는 이유는 DB 구조를 화면에 그대로 노출하지 않기 위해서입니다. DB row는 저장에 최적화되어 있고, DTO와 response는 화면과 API 계약에 맞게 정리된 형태입니다.

## 5. 인증 흐름

### 회원가입

1. 사용자가 `/signup`에서 이메일, 닉네임, 비밀번호를 입력합니다.
2. Web은 `authApi.signup()`으로 `/api/auth/signup`에 요청합니다.
3. API는 Zod schema로 입력을 검증합니다.
4. 이메일은 trim과 lowercase 처리 후 DB unique 제약으로 중복을 막습니다.
5. 비밀번호는 bcrypt cost 12로 해시해서 저장합니다.
6. API는 이메일 인증용 opaque token을 만들고 SHA-256 hash만 DB에 저장합니다.
7. 원본 token은 이메일 링크에만 포함됩니다.
8. 개발 환경에서는 Mailpit에서 인증 메일을 확인합니다.

### 이메일 인증

1. 사용자가 이메일 링크의 token을 들고 `/verify-email`로 들어옵니다.
2. Web은 `/api/auth/verify-email`로 token을 보냅니다.
3. API는 token hash를 찾아 만료, 사용 여부를 확인합니다.
4. 정상 token이면 `users.email_verified_at`을 채웁니다.
5. 인증 전 사용자는 로그인할 수 없습니다.

### 로그인과 세션 유지

1. 사용자가 `/login`에서 이메일과 비밀번호를 입력합니다.
2. API는 비밀번호 hash를 비교하고 이메일 인증 여부를 확인합니다.
3. 성공하면 access token과 refresh token을 발급합니다.
4. 두 token은 JavaScript에서 읽을 수 없는 HttpOnly cookie로 저장됩니다.
5. Web은 JWT를 localStorage에 저장하지 않고 `/api/auth/me`로 로그인 사용자를 복구합니다.
6. access token이 만료되어 API가 401을 반환하면 `apiFetch()`가 `/api/auth/refresh`를 한 번 호출하고 원래 요청을 재시도합니다.
7. refresh token은 사용할 때마다 회전되며, 이전 refresh token 재사용이 감지되면 같은 session family를 폐기합니다.

## 6. JWT에 들어가는 정보

JWT claim은 인증 판단에 필요한 최소 정보만 담습니다.

| Claim | 의미 |
| --- | --- |
| `sub` | 사용자 id |
| `type` | `access` 또는 `refresh` |
| `jti` | token 또는 refresh session 식별자 |
| `iat` | 발급 시각 |
| `exp` | 만료 시각 |
| `iss` | 발급자 |
| `aud` | 대상 서비스 |

이렇게 둔 이유는 token을 작고 단순하게 유지하기 위해서입니다. 사용자 이메일, 닉네임, 프로필 같은 정보는 바뀔 수 있으므로 JWT에 넣지 않고 필요할 때 DB에서 조회합니다.

## 7. 자료 CRUD 흐름

SourceWiki의 게시글은 `Source` 모델입니다.

### 자료 작성

1. 인증 완료 사용자가 `/sources/new`로 이동합니다.
2. `SourceForm`이 로그인 사용자를 `useMeQuery()`로 확인합니다.
3. URL 본문 가져오기를 누르면 `/api/tools/extract-url`로 요청합니다.
4. API는 SSRF 방어를 포함해 공개 HTTP(S) URL인지 검증합니다.
5. HTML 또는 text 본문을 가져와 정제하고 title, domain, preview, rawText를 반환합니다.
6. 사용자는 추출 결과를 검토하거나 직접 수정한 뒤 저장합니다.
7. 저장 요청은 `/api/sources`로 전달됩니다.
8. API는 인증, 이메일 인증, Zod validation을 거친 뒤 Prisma로 `sources`, `tags`, `source_tags`를 저장합니다.

### 자료 목록

1. `/sources` 페이지는 `page`, `q`, `tag`, `type` query string을 읽습니다.
2. 서버 컴포넌트에서 `/api/sources?page=...&limit=12`로 초기 데이터를 가져옵니다.
3. 결과를 TanStack Query cache에 넣고 client component가 이어받습니다.
4. API는 `createdAt DESC, id DESC`로 안정 정렬하고 `skip`, `take` 기반 pagination을 적용합니다.

### 자료 상세

1. `/sources/[id]`에서 자료 상세, 댓글, 파일 목록, 로그인 사용자를 함께 가져옵니다.
2. 작성자인 경우에만 수정, 삭제, AI 어시스턴트, 파일 관리 같은 동작이 보입니다.
3. API도 `assertOwner()`로 작성자 권한을 다시 확인합니다.
4. 프론트에서 버튼을 숨기는 것은 UX이고, 실제 보안은 API에서 보장합니다.

### 자료 수정과 삭제

1. 작성자는 `/sources/[id]/edit`에서 제목, URL, 본문, 요약, 태그, 메모를 수정합니다.
2. API는 `PATCH /api/sources/:id`에서 소유권과 입력값을 검증합니다.
3. 태그 변경은 transaction 안에서 기존 연결을 지우고 다시 생성합니다.
4. 삭제 시 `Source`를 삭제하면 댓글, 태그 연결, 좋아요, 파일 메타데이터는 relation에 따라 정리됩니다.
5. 실제 업로드 파일은 DB 삭제 후 disk에서도 제거합니다.

## 8. 댓글 흐름

댓글은 자료 상세 화면에 종속됩니다.

1. 비회원도 댓글 목록은 볼 수 있습니다.
2. 로그인 및 이메일 인증 완료 사용자만 댓글을 작성할 수 있습니다.
3. 댓글 작성은 `POST /api/sources/:id/comments`입니다.
4. 댓글 수정은 `PATCH /api/comments/:id`입니다.
5. 댓글 삭제는 `DELETE /api/comments/:id`입니다.
6. 작성자만 수정, 삭제할 수 있고 API가 최종 검증합니다.
7. 댓글 작성, 수정, 삭제 후 TanStack Query가 댓글, 자료 상세, 자료 목록 query를 무효화해 화면을 갱신합니다.

## 9. 상태관리 방식

이 프로젝트는 Redux 같은 전역 store 대신 TanStack Query를 중심으로 상태를 관리합니다.

관리하는 주요 서버 상태는 다음과 같습니다.

- 로그인 사용자: `['auth', 'me']`
- 자료 목록: `['sources', filters]`
- 자료 상세: `['source', id]`
- 댓글 목록: `['comments', id]`
- 파일 목록: `['source', id, 'files']`

이 선택의 이유는 대부분의 중요한 상태가 클라이언트 내부 상태가 아니라 서버에서 온 데이터이기 때문입니다. TanStack Query를 쓰면 캐싱, 재요청, mutation 이후 invalidate, 로딩/에러 상태 처리를 일관되게 관리할 수 있습니다.

폼 입력, AI 패널 열림 여부, 채팅 입력값 같은 화면 안의 일시적 상태는 React `useState`와 React Hook Form으로 관리합니다.

## 10. API 호출과 에러 처리

브라우저 API 요청은 `apps/web/src/lib/api/api-client.ts`의 `apiFetch()`로 모읍니다.

`apiFetch()`가 하는 일은 다음과 같습니다.

- `credentials: 'include'`로 HttpOnly cookie를 API 요청에 포함합니다.
- JSON body가 있으면 `Content-Type: application/json`을 붙입니다.
- 요청 timeout을 처리합니다.
- API 오류 응답을 `ApiError`로 변환합니다.
- 401이 발생하면 refresh 대상 요청인지 확인합니다.
- refresh 가능한 요청이면 `/api/auth/refresh`를 호출한 뒤 원 요청을 한 번 재시도합니다.

서버 오류 응답은 공통 형태를 사용합니다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요.",
    "requestId": "...",
    "fieldErrors": {
      "email": ["이미 사용 중인 이메일입니다."]
    }
  }
}
```

프론트 폼은 이 `fieldErrors`를 받아 개별 input 아래에 표시합니다.

## 11. Shared schema와 데이터 계약

`packages/shared/src/index.ts`는 Web과 API가 함께 쓰는 계약입니다.

주요 역할은 다음과 같습니다.

- Web form에서 같은 validation 기준을 사용합니다.
- API route에서 request body와 query를 검증합니다.
- API response type을 프론트에서 재사용합니다.
- Swagger/OpenAPI 문서와 실제 API 계약을 맞추는 기준이 됩니다.

예를 들어 자료 생성은 같은 `sourceCreateRequestSchema`를 기준으로 Web form과 API validation이 맞춰집니다. 이렇게 하면 프론트와 백엔드가 서로 다른 규칙을 적용해 생기는 불일치를 줄일 수 있습니다.

```text
사용자 입력
  -> Web form Zod validation
  -> API request
  -> API Zod validation
  -> service
  -> Prisma
  -> PostgreSQL
```

## 12. DB 관계

핵심 관계는 다음과 같습니다.

```text
User 1 ── N Source
User 1 ── N Comment
Source 1 ── N Comment
Source N ── N Tag through SourceTag
User N ── N Source through SourceLike
Source 1 ── N UploadedFile
User 1 ── N RefreshSession
User 1 ── N EmailVerificationToken
```

설계 기준은 다음과 같습니다.

- 사용자가 작성한 자료와 댓글은 user id로 소유권을 판단합니다.
- 자료가 삭제되면 댓글, 태그 연결, 좋아요, 업로드 파일 메타데이터는 함께 정리됩니다.
- 태그는 중복 생성을 막기 위해 normalized name을 unique로 둡니다.
- refresh session은 token 원문을 저장하지 않고 hash만 저장합니다.
- 이메일 인증 token도 원문이 아니라 hash만 저장합니다.

## 12.1 주요 테이블 설명

| 모델 | 역할 | 핵심 필드 |
| --- | --- | --- |
| `User` | 회원 계정 | `email`, `passwordHash`, `nickname`, `emailVerifiedAt` |
| `EmailVerificationToken` | 이메일 인증 링크 상태 | `tokenHash`, `expiresAt`, `usedAt` |
| `RefreshSession` | refresh token 회전 관리 | `familyId`, `tokenHash`, `revokedAt`, `replacedById` |
| `Source` | 저장된 자료 | `title`, `originalUrl`, `rawText`, `summary`, `userId` |
| `Comment` | 자료 댓글 | `sourceId`, `userId`, `content` |
| `Tag` | 태그 원본 | `name`, `normalizedName` |
| `SourceTag` | 자료와 태그 연결 | `sourceId`, `tagId` |
| `SourceLike` | 사용자별 자료 좋아요 | `userId`, `sourceId` |
| `UploadedFile` | 첨부 파일 메타데이터 | `sourceId`, `storedName`, `mimeType`, `sizeBytes` |

## 12.2 왜 join table을 쓰는가

태그와 좋아요는 단순히 Source 안에 배열로 넣을 수도 있지만, 관계형 DB에서는 별도 테이블로 분리하는 편이 유리합니다.

- 하나의 태그가 여러 자료에 붙을 수 있습니다.
- 하나의 자료가 여러 태그를 가질 수 있습니다.
- 특정 태그가 붙은 자료를 검색하기 쉽습니다.
- 한 사용자가 같은 자료에 좋아요를 여러 번 누르지 않게 `(userId, sourceId)`를 key로 막을 수 있습니다.

## 13. URL 추출과 보안

URL 추출은 단순 fetch가 아니라 보안 검증이 포함된 서버 기능입니다.

처리 순서는 다음과 같습니다.

1. WHATWG URL parser로 URL을 파싱합니다.
2. `http`, `https`만 허용합니다.
3. username, password, private IP, localhost 등을 차단합니다.
4. DNS resolve 결과가 public IP인지 검사합니다.
5. redirect가 있으면 redirect URL도 다시 검증합니다.
6. 최대 redirect 횟수, timeout, 응답 크기, Content-Type을 제한합니다.
7. HTML은 readability 계열 추출기로 본문만 정제합니다.
8. script, style, nav 같은 불필요한 영역은 제거합니다.
9. 원본 HTML은 저장하지 않고 정제 text만 저장합니다.

이 기능의 목적은 사용자가 URL 하나로 자료 등록을 시작하게 하되, 서버가 SSRF 같은 위험한 네트워크 요청을 막는 것입니다.

## 13.1 URL 추출 실패를 허용하는 이유

URL 추출은 외부 사이트 상태에 영향을 받습니다. 인증이 필요한 페이지, JavaScript 렌더링이 필요한 페이지, paywall, 차단된 robots 정책, 네트워크 timeout 때문에 실패할 수 있습니다.

그래서 SourceWiki는 URL 추출 실패를 자료 저장 실패로 취급하지 않습니다. 사용자는 URL만 저장하거나, 원문을 직접 붙여넣을 수 있습니다. 이 원칙은 AI 기능에도 동일하게 적용됩니다. 부가 기능이 실패해도 핵심 CRUD는 계속 동작해야 합니다.

## 14. AI 요약과 대화

AI 기능은 자료 CRUD와 분리된 부가 기능입니다. AI가 실패해도 자료 저장, 조회, 댓글 기능은 계속 동작해야 합니다.

지원 모드는 다음과 같습니다.

| 모드 | 의미 |
| --- | --- |
| `disabled` | AI API가 503을 반환하고 수동 작성만 사용 |
| `demo` | 고정 fixture를 반환하고 화면에 데모 결과로 표시 |
| `ollama` | 로컬 Ollama `/api/generate` 호출 |

요약 흐름은 다음과 같습니다.

1. 작성자가 rawText가 있는 자료에서 AI 요약을 요청합니다.
2. API는 원문 일부를 prompt에 넣습니다.
3. 모델에는 제공된 원문만 근거로 답하라고 지시합니다.
4. 응답은 JSON schema로 검증합니다.
5. parse 실패 시 한 번 repair 요청을 시도합니다.
6. 결과는 바로 DB에 저장하지 않고 프론트 검토 초안으로 보여줍니다.
7. 사용자가 적용해야 `summary`, `keyPoints`, `keywords`, `tags`가 저장됩니다.

AI 대화와 추천 질문도 같은 원칙을 따릅니다. 저장된 자료의 rawText만 근거로 답하고, 채팅 기록은 DB에 저장하지 않는 session-only 상태입니다.

## 14.1 AI 요청 경로

AI 요청은 일반 API 요청보다 오래 걸릴 수 있어 Web에서 별도 proxy route를 사용합니다.

```text
SourceDetailView
  -> sourceApi.summarize/chat/suggestQuestions
  -> /ai-proxy/sources/:id/*
  -> Next route handler
  -> Express API /api/sources/:id/*
  -> source-summarizer
  -> Ollama 또는 demo response
```

이렇게 분리한 이유는 로컬 개발에서 긴 LLM 요청이 일반 rewrite proxy에서 끊기는 문제를 줄이기 위해서입니다.

## 14.2 AI 결과 저장 원칙

AI 결과는 자동으로 DB에 저장하지 않습니다.

```text
AI 생성 결과
  -> 프론트 초안 상태
  -> 사용자 검토와 수정
  -> 적용 버튼
  -> PATCH /api/sources/:id
  -> DB 저장
```

이 구조는 AI 응답을 정답이 아니라 편집 가능한 초안으로 다루기 위한 것입니다.

## 15. 파일 업로드

파일 업로드는 자료에 부속되는 선택 기능입니다.

1. 자료 작성자는 자료에 파일을 첨부할 수 있습니다.
2. 허용 파일은 pdf, txt, md, png, jpg, webp입니다.
3. 최대 크기는 10MB입니다.
4. 파일 본문 파싱은 하지 않고 파일 메타데이터와 disk 저장만 담당합니다.
5. DB에는 원본 파일명, 저장 파일명, MIME type, 크기, 작성자를 저장합니다.
6. 실제 파일은 `UPLOAD_DIR` 또는 Docker volume에 저장합니다.
7. 다운로드는 공개 자료 정책에 맞춰 공개로 제공합니다.
8. 삭제는 자료 작성자만 가능합니다.

## 16. 선택 기능의 위치

검색, 좋아요, 사용자 프로필, 파일 업로드, 관련 자료, 지식 그래프, AI 어시스턴트는 기본 게시판 요구사항을 넘어 SourceWiki의 성격을 강화하는 기능입니다.

이 기능들은 다음처럼 기존 구조 위에 얹혀 있습니다.

| 기능 | 기존 구조와 연결되는 지점 |
| --- | --- |
| 검색과 필터 | `GET /api/sources` query 확장 |
| 좋아요 | `SourceLike` join table |
| 사용자 프로필 | `User`와 사용자의 자료/댓글 통계 |
| 파일 업로드 | `UploadedFile`과 runtime upload directory |
| 관련 자료 | 공통 태그 기반 후보 계산 |
| 지식 그래프 | 최근 자료와 태그 연결을 graph 데이터로 변환 |
| AI 어시스턴트 | `Source.rawText` 기반 요약, 질문 추천, 대화 |

중요한 점은 선택 기능이 핵심 CRUD를 깨지 않도록 분리되어 있다는 것입니다.

## 17. Docker와 배포 구조

로컬 전체 Docker stack은 다음 서비스로 구성됩니다.

| 서비스 | 역할 |
| --- | --- |
| `db` | PostgreSQL |
| `mailpit` | 개발용 이메일 수신함 |
| `api` | Express API |
| `web` | Next.js Web |
| `caddy` | Web/API reverse proxy |

운영에서는 Mailpit을 제외하고 실제 SMTP를 사용합니다. 운영 Compose에서는 Caddy만 80/443을 공개하고 DB는 외부에 직접 노출하지 않습니다.

GitHub Actions 흐름은 다음과 같습니다.

1. PR 또는 main push에서 CI 실행
2. PostgreSQL service container 준비
3. migration deploy
4. lint
5. typecheck
6. unit/integration test
7. build
8. format check
9. Docker Compose smoke
10. Playwright E2E
11. main CI 성공 시 Deploy workflow 실행
12. Web/API 이미지를 GHCR에 push
13. EC2에서 image pull
14. migration deploy
15. compose up
16. HTTPS smoke

## 18. 테스트 전략

테스트는 계층별로 나뉩니다.

- shared schema test: Zod schema와 타입 계약 확인
- API unit/integration test: 인증, 자료, 댓글, 파일, URL 추출, AI 응답 검증
- OpenAPI test: Swagger 문서가 유효한지 확인
- Web API client test: refresh 처리와 오류 파싱 확인
- Playwright E2E: 회원가입, 이메일 인증, 로그인 복구, 자료/댓글 CRUD, 페이징 확인
- Compose smoke: 실제 Docker stack이 Caddy 경유로 응답하는지 확인

테스트의 목적은 기능이 한 번 동작하는지만 보는 것이 아닙니다. 인증 경계, 권한 경계, API 문서, Docker 실행 구조까지 함께 검증해 서비스 전체 흐름이 유지되는지 확인합니다.

## 19. 개념 확인용 문답

### Q. 이 프로젝트는 어떤 구조인가요?

Next.js Web, Express API, PostgreSQL DB를 분리한 full-stack 구조입니다. Web과 API는 `packages/shared`의 Zod schema와 TypeScript type을 공유하고, 로컬/운영에서는 Caddy가 Web과 API를 같은 origin으로 묶어줍니다.

### Q. 왜 monorepo를 사용했나요?

Web과 API가 같은 요청/응답 schema를 사용하기 때문입니다. `packages/shared`에 공통 Zod schema를 두면 프론트 폼 검증, API validation, TypeScript type을 같은 기준으로 맞출 수 있습니다.

### Q. 상태관리는 무엇을 사용했나요?

TanStack Query를 사용했습니다. 이 프로젝트의 주요 상태는 로그인 사용자, 자료 목록, 자료 상세, 댓글처럼 서버에서 가져오는 데이터입니다. 그래서 전역 client store보다 서버 상태 캐싱과 mutation 이후 invalidate가 쉬운 TanStack Query가 적합했습니다.

### Q. 로그인 상태는 어디에 저장하나요?

JWT는 HttpOnly cookie에 저장합니다. 프론트 JavaScript는 token을 직접 읽지 않습니다. 화면에서는 `/api/auth/me` 응답을 TanStack Query의 `['auth', 'me']` cache로 관리합니다.

### Q. 새로고침하면 로그인은 어떻게 유지되나요?

브라우저가 HttpOnly cookie를 계속 가지고 있으므로, 새로고침 후 Web이 `/api/auth/me`를 호출하면 API가 access token을 검증해 현재 사용자를 반환합니다. access token이 만료된 경우 client API wrapper가 refresh를 한 번 시도합니다.

### Q. 토큰이 만료되면 어떻게 되나요?

API 요청이 401을 반환하면 `apiFetch()`가 `/api/auth/refresh`를 호출합니다. refresh가 성공하면 원래 요청을 한 번 재시도합니다. refresh가 실패하면 사용자는 비로그인 상태가 되고 다시 로그인해야 합니다.

### Q. JWT에는 어떤 정보를 넣었나요?

사용자 id인 `sub`, token 종류인 `type`, token 식별자인 `jti`, 발급/만료 시각인 `iat`, `exp`, 그리고 `iss`, `aud`를 넣었습니다. 이메일이나 닉네임처럼 바뀔 수 있거나 노출할 필요 없는 정보는 넣지 않았습니다.

### Q. 이메일 인증은 어떻게 처리했나요?

회원가입 시 opaque token을 만들고, DB에는 token 원문이 아니라 SHA-256 hash만 저장합니다. 원본 token은 이메일 링크에만 들어갑니다. 사용자가 링크를 열면 API가 token hash를 비교하고 만료/사용 여부를 확인한 뒤 `email_verified_at`을 채웁니다.

### Q. API 요청 시 인증 token은 어떻게 전달하나요?

브라우저가 HttpOnly cookie를 자동으로 포함합니다. 프론트의 `apiFetch()`는 `credentials: 'include'`를 사용합니다. Authorization header에 token을 직접 넣거나 localStorage에서 꺼내지 않습니다.

### Q. 권한 검증은 어디서 하나요?

프론트는 작성자에게만 수정/삭제 버튼을 보여주지만, 이것은 UX입니다. 실제 권한은 API service의 `assertOwner()` 같은 함수에서 DB의 user id와 로그인 user id를 비교해 검증합니다.

### Q. DB 관계는 어떻게 설계했나요?

사용자는 여러 자료와 댓글을 작성할 수 있고, 자료는 여러 댓글을 가집니다. 태그는 여러 자료에 붙을 수 있으므로 `SourceTag` join table을 사용했습니다. 좋아요도 사용자와 자료의 다대다 관계라 `SourceLike`를 사용했습니다.

### Q. 댓글은 어떻게 연결되나요?

댓글은 `sourceId`와 `userId`를 가집니다. `sourceId`로 어떤 자료의 댓글인지 알 수 있고, `userId`로 작성자를 알 수 있습니다. 자료가 삭제되면 댓글은 cascade로 함께 삭제됩니다.

### Q. 페이징은 어떻게 구현했나요?

API에서 `page`, `limit` query를 받고 Prisma의 `skip`, `take`로 필요한 범위만 조회합니다. 정렬은 `createdAt DESC, id DESC`로 안정적으로 처리합니다. 응답에는 `totalItems`, `totalPages`도 포함합니다.

### Q. API 에러 처리는 어떻게 하나요?

API는 `AppError`와 공통 error handler를 사용해 `{ code, message, requestId, fieldErrors }` 형태로 응답합니다. 프론트는 `ApiError`로 변환해 form field error 또는 alert로 표시합니다.

### Q. URL 추출에서 조심한 보안 이슈는 무엇인가요?

가장 중요한 것은 SSRF 방어입니다. localhost, private IP, cloud metadata 주소 등으로 요청하지 못하게 URL과 DNS 결과를 검증합니다. redirect도 매번 다시 검증하고, timeout과 응답 크기도 제한합니다.

### Q. AI 기능이 실패하면 서비스도 실패하나요?

아닙니다. AI는 자료 CRUD와 분리된 선택 기능입니다. `AI_MODE=disabled`나 timeout이어도 자료 작성, 수정, 댓글은 계속 동작합니다. AI 결과도 자동 저장하지 않고 사용자가 검토 후 적용해야 저장됩니다.

### Q. Swagger는 왜 넣었나요?

REST API를 문서로 확인할 수 있게 하기 위해서입니다. 과제에서 API 문서를 요구하고, 프론트와 백엔드가 어떤 endpoint와 request/response 계약으로 통신하는지 설명하기 좋습니다.

### Q. Docker는 어떤 역할인가요?

개발에서는 PostgreSQL과 Mailpit 같은 인프라를 쉽게 띄우고, 전체 Docker 모드에서는 Web, API, DB, Caddy까지 실제 운영과 비슷한 구조로 실행합니다. 운영에서는 GHCR image와 `compose.production.yaml`로 EC2에서 실행합니다.

### Q. 배포는 어떻게 자동화했나요?

GitHub Actions의 CI가 테스트와 빌드를 통과하면 Deploy workflow가 Web/API Docker image를 GHCR에 push하고, EC2에 SSH로 접속해 image pull, migration deploy, compose up, HTTPS smoke를 수행합니다.

## 20. 흐름별 요약

### 회원가입과 로그인

```text
SignupForm
  -> POST /api/auth/signup
  -> bcrypt password hash
  -> users insert
  -> email_verification_tokens insert
  -> Mailpit or SMTP
  -> verify-email
  -> email_verified_at update
  -> login
  -> access_token, refresh_token cookie
```

### 자료 작성

```text
SourceForm
  -> optional extract-url
  -> POST /api/sources
  -> authenticate
  -> requireVerifiedUser
  -> validateBody
  -> createSource
  -> sources insert
  -> tags upsert
  -> source_tags insert
```

### 자료 조회

```text
SourcesPage server component
  -> serverApiFetch /api/sources
  -> listSources
  -> Prisma findMany + count
  -> HydrationBoundary
  -> SourceList client component
  -> TanStack Query cache
```

### 댓글 작성

```text
CommentsPanel
  -> POST /api/sources/:id/comments
  -> authenticate
  -> requireVerifiedUser
  -> validateBody
  -> comments.createComment
  -> comments insert
  -> invalidate comments/detail/list queries
```

### access token 만료

```text
apiFetch request
  -> API returns 401
  -> POST /api/auth/refresh
  -> refresh token verification
  -> refresh session rotation
  -> new cookies
  -> retry original request once
```

## 21. 제출 전 확인 체크리스트

- `/signup`에서 회원가입이 되는가?
- Mailpit 또는 실제 SMTP에서 인증 메일을 받을 수 있는가?
- 이메일 인증 후 로그인할 수 있는가?
- 새로고침 후에도 로그인 상태가 유지되는가?
- access token 만료 시 refresh 흐름을 설명할 수 있는가?
- 비회원이 자료 목록과 상세를 볼 수 있는가?
- 로그인 사용자가 자료를 작성할 수 있는가?
- 작성자만 자료 수정/삭제가 가능한가?
- 댓글 작성, 조회, 수정, 삭제가 되는가?
- 작성자만 댓글 수정/삭제가 가능한가?
- 자료 목록에서 페이지 이동이 되는가?
- `/api/docs`에서 Swagger가 열리는가?
- `/api/openapi.json`이 열리는가?
- Docker 전체 stack이 Caddy 경유로 열리는가?
- 운영 제출 URL이 HTTPS로 열리는가?
- GitHub Actions CI/CD가 성공했는가?

## 22. 핵심 문장

- 이 프로젝트는 단순 게시판이 아니라 URL 기반 AI 기술 자료 아카이브입니다.
- Web과 API는 shared Zod schema로 같은 계약을 공유합니다.
- 로그인 token은 localStorage가 아니라 HttpOnly cookie에 저장합니다.
- 프론트는 로그인 상태를 `/api/auth/me`와 TanStack Query로 관리합니다.
- 권한은 프론트에서 숨기는 것만으로 끝내지 않고 API에서 다시 검증합니다.
- DB 관계는 사용자, 자료, 댓글, 태그, 좋아요, 파일을 중심으로 설계했습니다.
- URL 추출은 SSRF 방어를 포함해 안전하게 제한된 요청만 수행합니다.
- AI 기능은 실패해도 CRUD를 막지 않는 선택 기능입니다.
- Docker와 Caddy로 Web/API/DB 실행 구조를 운영에 가깝게 구성했습니다.
- GitHub Actions로 테스트, 빌드, 배포 smoke를 자동화했습니다.
