# ㅁ2026 하반기 과제: Frontend to FullStack - Build &amp; Understand

#### 👋 서비스 구조를 이해하기 위한 과제입니다.

> 이번 과제는 **프론트엔드 개발자가 백엔드와 데이터베이스까지 포함한 전체 흐름을 이해하며, 실제 서비스를 구현해보는 것**을 목표로 합니다.
>
> 과제는 **Frontend 개발을 중심으로 진행**되며, Backend, Database, Cloud Server는 **로그인 및 CRUD 흐름을 이해하기 위한 보조 도구**로 활용됩니다.
>
> **평가는 Frontend 구현 완성도와 전체 흐름에 대한 이해도를 중심으로 진행**되니, 처음 접하는 내용이 있는 경우 **AI를 활용하여 스스로 학습하고 해결해보는 연습**도 함께 진행하시기 바랍니다.
>
> 그 외의 기능 및 서비스 구성은 자유롭게 아이디어를 반영하시면 되며, **해당 부분은 평가 대상에 포함되지 않습니다.**

# 과제 목표

- 웹 서비스의 전체 구조를 이해합니다.
- 로그인 기반의 인증 시스템을 구현합니다.
- 프론트엔드와 백엔드 간의 데이터 통신 흐름을 이해합니다.
- 클라우드 환경에서 서비스를 배포하는 과정을 경험합니다.
- Git을 활용한 자동 배포 프로세스를 경험합니다.

---

# **항목 설명**

- 표시가 있는 항목은 필수입니다.

### 📡 **Cloud Server**

클라우드 환경에서 서버를 생성하고 애플리케이션을 배포합니다.

- Oracle Cloud (무료)
- Google Cloud (기간 무료)
- Amazon Web (기간 무료)

목표

- 실제 서버에서 서비스 실행
- API 서버 및 프론트엔드 배포

### 🔩 Docker

Docker를 사용하여 애플리케이션 실행 환경을 구성합니다.

목표

- 환경 의존성 문제 해결
- 컨테이너 기반 서버 운영 이해

### ⚙️ **backend** *

백엔드는 다음 언어 중 하나를 선택

- Python
- Node.js

백엔드 서버는 다음 역할을 수행합니다.

- API 제공
- 인증 처리
- 데이터베이스 접근
- 비즈니스 로직 처리

### 🧻 **DB** *

데이터베이스는 다음 중 하나를 선택

- MySql
- PostgreSQL
- MongoDB

데이터베이스 설계 시 다음 사항을 고려합니다.

- 사용자 테이블
- 게시글 테이블
- 댓글 테이블
- 관계 설정

### ⛓️ API *****

API 서버는 **REST API 방식으로 설계합니다.**

- FastAPI
- Express.js

### 🖲️ Swagger

API 문서를 Swagger를 통해 제공합니다.

### 🖥️ Frontend *****

프론트엔드는 다음 프레임워크 중 하나를 선택

- Next
- Nuxt

프론트엔드는 다음 역할을 수행합니다.

- 사용자 인터페이스 제공
- 로그인 상태 관리
- 게시판 화면 구성

### 🪬 Github

Github를 사용하여 프로젝트를 관리합니다.

- GitHub Actions를 사용한 자동 배포

---

# 주요 로직 (필수 구현)

다음 기능은 반드시 구현해야 합니다.

### 🚤 로그인

사용자는 이메일과 비밀번호로 로그인할 수 있어야 합니다.

구현 요구사항

- JWT 기반 인증
- 로그인 성공 시 토큰 발급
- 인증이 필요한 API 보호

### 😊 회원가입

사용자가 계정을 생성할 수 있어야 합니다.

요구사항

- 이메일 중복 검사
- 이메일 인증
- 비밀번호 암호화 저장 (bcrypt 등 사용)
- 기본 사용자 정보 저장

### 💁🏾 게시판

로그인한 사용자만 게시글을 작성할 수 있습니다.  
본인이 작성한 글만 수정/삭제가 가능해야 합니다.

기능

- 게시글 작성
- 게시글 목록 조회
- 게시글 상세 조회
- 게시글 수정
- 게시글 삭제

### 🥹 댓글

로그인 사용자만 게시글에 댓글을 작성할 수 있습니다.  
본인이 작성한 댓글만 수정/삭제가 가능해야 합니다.

기능

- 댓글 작성
- 댓글 조회
- 댓글 삭제

### ✌🏻 페이징

게시글 목록 조회 시 페이징 기능을 구현합니다.

목표

- 서버 데이터 효율적 조회
- UI 페이지 처리

### 😍 추가 구현 (선택)

다음 기능은 선택적으로 구현할 수 있습니다.

- 좋아요 기능
- 게시글 검색
- 파일 업로드
- 사용자 프로필
- 그 외 만들고 싶은 모든 것 😊

---

# 제출 내용

다음 내용을 제출해야 합니다.

- Github Repository 링크
- 배포된 서비스 URL 있다면 제출
- Swagger API 문서 URL 있다면 제출

---

# 평가 기준

다음 기준을 중심으로 평가합니다.

**🐣  평가는 정답 여부보다는 이해도를 기준으로 하며, Frontend 관점에서 진행됩니다.**  
**아래 기능별 항목에는 예상 질문이 포함되어 있습니다.**

### Backend

- JWT 인증 구현
  - JWT 토큰에는 어떤 정보를 포함하셨나요?

    **답변**
    사용자를 식별하는 `sub`, access와 refresh를 구분하는 `type`, 세션을 식별하는 `jti`를 담았습니다.
    여기에 표준 클레임인 발급자 `iss`, 대상 `aud`, 발급 시각 `iat`, 만료 `exp`를 함께 넣고,
    검증할 때 서명뿐 아니라 `iss`와 `aud`까지 확인합니다.
    수명은 access 15분, refresh 14일입니다.
    두 토큰은 **서로 다른 비밀키**로 서명해서, access 키가 유출되어도 refresh를 위조할 수 없게 했습니다.

    **근거 코드**
    - `apps/api/src/lib/jwt.ts:19` — `signAuthToken` (발급)
    - `apps/api/src/lib/jwt.ts:35` — `verifyAuthToken` (검증)

    **꼬리 질문** — Q. 이메일이나 권한 정보는 왜 안 넣었나요?
    A. JWT는 서명만 되어 있고 내용은 누구나 열어볼 수 있습니다. 그래서 식별자만 넣고 나머지는 서버가 DB에서 조회합니다. 닉네임이 바뀌어도 토큰이 낡지 않는 이점도 있습니다.

### Database

- 테이블 관계
  - 테이블 간 관계를 어떤 기준으로 설계하셨나요?

    **답변**
    세 가지 기준으로 나눴습니다.
    첫째, 소유 관계는 1대다로 두었습니다. 사용자 하나가 자료 여러 개를, 자료 하나가 댓글 여러 개를 가집니다.
    둘째, 다대다는 연결 테이블로 풀었습니다. 자료와 태그는 `SourceTag`가 잇고,
    좋아요는 사용자와 자료의 복합 기본키로 두어 같은 사람이 두 번 누르는 것을 **데이터베이스가** 막습니다.
    셋째, 삭제 규칙을 관계마다 다르게 정했습니다. 자료를 지우면 댓글·태그·좋아요·파일은 `Cascade`로 함께 지워지지만,
    사용자는 `Restrict`라서 작성한 글이 남아 있으면 계정이 삭제되지 않습니다. 작성자 없는 글이 생기지 않게 한 것입니다.

    **근거 코드**
    - `apps/api/prisma/schema.prisma:74` — `Source.user` (`onDelete: Restrict`)
    - `apps/api/prisma/schema.prisma:92` — `SourceLike` 복합 기본키 `@@id([userId, sourceId])`
    - `apps/api/prisma/schema.prisma:140` — `SourceTag` 연결 테이블
    - `apps/api/prisma/schema.prisma:80` — 페이징 정렬용 복합 인덱스

    **꼬리 질문** — Q. 좋아요 중복은 애플리케이션에서 막으면 안 되나요?
    A. 막을 수 있지만 동시에 두 번 눌리면 조회와 저장 사이에서 새어나갑니다. 복합 기본키로 두면 데이터베이스가 거절하므로 확실합니다.

### Frontend

- Store 상태관리
  - 상태 관리는 어떤 라이브러리를 사용하셨나요?

    **답변**
    TanStack Query v5 하나만 썼습니다. Redux나 Zustand 같은 전역 Store는 넣지 않았습니다.
    대신 성격이 다른 상태는 다른 도구로 나눴습니다. 폼 입력과 검증은 react-hook-form과 Zod가,
    화면 안에서만 쓰는 값은 React의 `useState`가 맡습니다. 셋의 범위가 겹치지 않습니다.

    **근거 코드**
    - `apps/web/src/lib/query/query-provider.tsx:7` — `QueryClient` 생성 및 전역 등록

    **꼬리 질문** — Q. 전역 Store가 정말 필요 없었나요?
    A. 필요한 순간이 없었습니다. 화면끼리 공유해야 하는 값이 전부 서버 데이터라서 TanStack Query 캐시가 그 역할을 대신했습니다.

  - 어떤 데이터들을 상태 관리로 관리하셨나요?

    **답변**
    서버에 원본이 있는 데이터를 TanStack Query가 관리합니다. 자료 목록과 상세, 댓글, 첨부파일,
    그리고 로그인한 사용자 정보입니다. 캐시 이름표는 `sourceKeys`에 모아 두고, 목록은 `sources`,
    상세는 `source`로 나눠서 무효화 범위가 서로 겹치지 않게 했습니다.
    로그인 정보도 서버가 판단하는 값이라 `['auth', 'me']`라는 이름표로 같은 캐시에 넣었습니다.
    폼 입력값은 react-hook-form이, 선택한 태그나 미리보기 표시처럼 새로고침하면 사라져도 되는 값은 `useState`가 맡습니다.

    **근거 코드**
    - `apps/web/src/features/sources/source-api.ts:38` — `sourceKeys` (이름표 정의)
    - `apps/web/src/features/auth/use-me-query.ts:8` — `useMeQuery`

    **꼬리 질문** — Q. 로그인 정보를 왜 전역 상태가 아니라 서버 데이터로 봤나요?
    A. 로그인 여부의 진짜 기준이 서버의 쿠키 검증 결과이기 때문입니다. 프론트가 따로 들고 있으면 토큰이 만료됐는데도 로그인 상태로 남는 어긋남이 생깁니다.

  - 상태관리 라이브러리를 선택한 이유는 무엇인가요?

    **답변**
    상태를 서버 상태와 클라이언트 상태로 나눠서 봤기 때문입니다.
    서버 상태는 원본이 서버에 있고 우리가 가진 것은 사본이라 시간이 지나면 낡습니다.
    그래서 캐시, 무효화, 중복 요청 제거, 로딩과 에러 관리가 늘 따라오는데 Redux나 Zustand는 그걸 전부 직접 짜야 합니다.
    TanStack Query는 그게 기본으로 들어 있습니다.
    결정적이었던 것은, 글을 저장한 뒤 `invalidateQueries` 한 줄이면 몇 페이지를 보고 있든 어떤 검색 조건이든 목록이 갱신된다는 점이었습니다.

    **근거 코드**
    - `apps/web/src/features/sources/source-form.tsx:142` — 저장 성공 후 `onSuccess`에서 `invalidateQueries`

    **꼬리 질문** — Q. 그럼 Zustand는 언제 쓰나요?
    A. 여러 화면이 공유하는데 서버와 무관한 값일 때입니다. 결제 전 장바구니나 여러 단계에 걸친 폼 같은 것인데, 이 프로젝트에는 그런 값이 없었습니다.

- API 연동
  - API 요청은 어떤 방식으로 호출하셨나요?

    **답변**
    브라우저의 `fetch`를 `apiFetch`라는 공통 함수로 감싸서 호출합니다. axios 같은 별도 HTTP 라이브러리는 쓰지 않았습니다.
    필요한 것이 쿠키 전달, 타임아웃, 401 재시도 정도라서 의존성을 늘릴 이유가 없었습니다.
    다만 서버 컴포넌트에서 렌더링할 때는 브라우저가 아니라 Next 서버가 호출하기 때문에 `serverApiFetch`를 따로 두었습니다.

    **근거 코드**
    - `apps/web/src/lib/api/api-client.ts:48` — `apiFetch` (브라우저용)
    - `apps/web/src/lib/api/server-api.ts:7` — `serverApiFetch` (서버 컴포넌트용)

    **꼬리 질문** — Q. 왜 두 개로 나눴나요?
    A. 서버는 쿠키를 자동으로 붙여주지 않아 사용자의 쿠키를 직접 옮겨 담아야 하고, 상대 경로도 쓸 수 없습니다. 게다가 서버 전용 코드가 브라우저로 새면 안 되어서 `server-only`로 잠가 두었습니다.

  - API 호출 로직은 어떤 위치에서 관리하고 있나요?

    **답변**
    기능별 API 파일에 모아 뒀습니다. `auth-api.ts`, `source-api.ts`, `user-api.ts`입니다.
    화면 컴포넌트는 URL이나 HTTP 메서드를 모르고 `sourceApi.create()`처럼 업무 이름만 부릅니다.
    실제로 AI 관련 요청만 `/ai-proxy/`라는 다른 경로로 나가는데, 화면 코드는 그 차이를 전혀 모릅니다.
    경로가 바뀌어도 API 파일 한 줄만 고치면 되고, 화면을 하나씩 찾아다닐 필요가 없습니다.

    **근거 코드**
    - `apps/web/src/features/auth/auth-api.ts:10` — `authApi`
    - `apps/web/src/features/sources/source-api.ts:46` — `sourceApi` (`/ai-proxy/` 경로도 여기에 숨어 있음)

    **꼬리 질문** — Q. 왜 파일 종류가 아니라 기능별로 폴더를 나눴나요?
    A. 로그인 기능을 고칠 때 `features/auth` 폴더 하나만 보면 되기 때문입니다. 종류별로 나누면 화면, 훅, API 폴더를 오가야 합니다.

  - 공통 API 요청 처리를 위해 어떤 구조를 사용하셨나요?

    **답변**
    세 층으로 나눴습니다. 화면은 무엇을 할지만 알고, 기능별 API 파일은 어디로 보낼지를 알고, `apiFetch`는 어떻게 보낼지를 압니다.
    `apiFetch` 한 곳에서 쿠키 포함, `Content-Type` 설정, 10초 타임아웃, 서버 오류를 `ApiError`로 바꾸는 일,
    401일 때 세션을 갱신하고 재시도하는 일까지 전부 처리합니다.
    그래서 새 API를 추가할 때 한 줄만 쓰면 이 공통 처리가 그대로 따라옵니다.

    **근거 코드**
    - `apps/web/src/lib/api/api-client.ts:48` — `apiFetch` 본체
    - `apps/web/src/lib/api/api-client.ts:62` — FormData면 `Content-Type`을 붙이지 않는 분기

    **꼬리 질문** — Q. 파일 업로드는 어떻게 처리했나요?
    A. 본문이 FormData면 `Content-Type`을 붙이지 않습니다. 브라우저가 경계 문자열을 포함해 직접 정해야 하는데 우리가 덮어쓰면 서버가 파싱하지 못합니다.

  - API 요청 시 인증 토큰은 어떻게 전달하셨나요?

    **답변**
    프론트가 직접 전달하지 않습니다. 로그인에 성공하면 서버가 `httpOnly` 쿠키로 심고,
    `apiFetch`에 `credentials: 'include'`를 켜 두어 브라우저가 자동으로 실어 보냅니다.
    `Authorization` 헤더를 만드는 코드도, `localStorage`에 저장하는 코드도 없습니다.
    `localStorage`를 피한 이유는 자바스크립트가 읽을 수 있어 XSS로 유출될 수 있기 때문이고,
    대신 쿠키에서 생기는 CSRF 위험은 `sameSite` 설정과 서버의 Origin 검사로 막았습니다.

    **근거 코드**
    - `apps/web/src/lib/api/api-client.ts:59` — `credentials: 'include'`
    - `apps/api/src/modules/auth/auth.routes.ts:22` — `setAuthCookies` (쿠키를 심는 곳)
    - `apps/api/src/middleware/origin.ts:8` — `verifyOrigin` (CSRF 방어)

    **꼬리 질문** — Q. 쿠키를 두 개로 나눈 이유는 무엇인가요?
    A. 역할이 다릅니다. access는 모든 경로에 15분짜리로 붙고, refresh는 `/api/auth` 경로에만 14일짜리로 붙습니다. refresh는 갱신할 때 말고는 아예 전송되지 않아 노출될 기회가 줄어듭니다.

- 에러 처리
  - 프론트엔드에서 API 에러는 어떻게 처리하셨나요?

    **답변**
    공통 `apiFetch` 한 곳에서 처리합니다.
    서버는 어떤 오류든 `error` 안에 `code`, `message`, `requestId`를 담고 입력값 문제면 `fieldErrors`까지 넣어 한 가지 모양으로 내려줍니다.
    `apiFetch`의 `parseError`가 그것을 `ApiError` 객체로 되살립니다.
    화면에서는 `fieldErrors`를 해당 입력칸 아래에 붙이고, 그 외 오류는 폼 상단에 보여 줍니다.
    401이면 refresh로 세션을 갱신한 뒤 원래 요청을 **한 번만** 다시 보내고, 갱신도 실패하면 다시 로그인하도록 안내합니다.

    **근거 코드**
    - `apps/web/src/lib/api/api-client.ts:3` — `ApiError` 클래스
    - `apps/web/src/lib/api/api-client.ts:23` — `parseError` (서버 JSON을 객체로 변환)
    - `apps/web/src/features/sources/source-form.tsx:151` — `fieldErrors`를 입력칸에 붙이는 곳

    **꼬리 질문** — Q. 네트워크가 끊기면 어떻게 되나요?
    A. 응답 자체가 없으니 `ApiError`로 바꿀 JSON이 없습니다. 그럴 때는 타임아웃 10초가 걸리고, 화면에서는 네트워크 연결을 확인해 달라는 메시지를 보여 줍니다.

  - 공통 에러 처리를 위해 어떤 구조를 사용하셨나요?

    **답변**
    서버와 프론트가 **하나의 오류 형식을 공유하는** 구조입니다.
    서버에서는 서비스 계층이 `AppError`를 던지면 맨 끝의 `errorHandler`가 정해진 JSON으로 바꿉니다.
    예상하지 못한 오류는 내용을 감추고 500과 `INTERNAL_ERROR`로만 응답하되 로그에는 남깁니다.
    프론트에서는 모든 기능별 API가 `apiFetch`를 거치므로 그 JSON이 항상 `ApiError`로 변환됩니다.
    여기에 두 가지를 더했습니다. 동시에 401이 여러 개 나도 갱신 요청은 한 번만 나가게 묶었고,
    로그인·refresh·logout은 재시도 대상에서 제외했습니다. 비밀번호가 틀린 401을 만료로 오해하지 않기 위해서입니다.

    **근거 코드**
    - `apps/api/src/middleware/error-handler.ts:10` — `errorHandler` (서버 쪽 형식 통일)
    - `apps/web/src/lib/api/api-client.ts:16` — `refreshPromise` (갱신 요청 한 번만)
    - `apps/web/src/lib/api/api-client.ts:17` — `REFRESH_EXCLUDED_PATHS` (재시도 제외 경로)

    **꼬리 질문** — Q. `requestId`는 왜 넣었나요?
    A. 사용자가 본 오류 화면의 번호로 서버 로그를 바로 찾기 위해서입니다. 요청이 들어올 때 발급해서 응답과 로그에 같이 넣습니다.

- 로그인
  - 로그인 상태 확인은 어떤 방식으로 처리하셨나요?

    **답변**
    프론트가 임의의 값을 들고 판단하지 않고, 서버에 물어보는 방식입니다.
    TanStack Query의 `useQuery`를 감싼 `useMeQuery` 훅이 `authApi.me()`를 통해 `GET /api/auth/me`를 호출하면,
    서버가 `httpOnly` 쿠키의 `access_token`을 검증합니다.
    사용자 정보가 오면 로그인 상태로 처리하고, 401이 오면 `null`로 두어 비로그인으로 처리합니다.
    401을 에러로 던지지 않고 `null`로 바꾸는 이유는, 비로그인이 오류가 아니라 정상 상태이기 때문입니다.

    **근거 코드**
    - `apps/web/src/features/auth/use-me-query.ts:8` — `useMeQuery` (401을 `null`로 변환)
    - `apps/api/src/middleware/authenticate.ts:6` — `authenticate` (쿠키의 access token 검증)

    **꼬리 질문** — Q. 화면마다 물어보면 요청이 너무 많지 않나요?
    A. 같은 이름표를 쓰므로 TanStack Query가 한 번만 요청하고, `staleTime`을 5분으로 두어 그 사이에는 캐시를 씁니다.

  - 로그인 상태는 어디에 저장하셨나요?

    **답변**
    JWT 원문은 프론트 어디에도 저장하지 않습니다.
    access와 refresh 토큰은 서버가 `httpOnly` 쿠키로 관리하고, 자바스크립트로는 읽을 수 없습니다.
    프론트가 가진 것은 `/api/auth/me`에서 받은 사용자 정보뿐이고, 그것을 `['auth', 'me']`라는 이름표로 TanStack Query 캐시에 둡니다.
    이 캐시는 메모리에만 있어서 탭을 닫으면 사라지고, 로그인 여부의 진짜 기준은 언제나 서버의 쿠키입니다.

    **근거 코드**
    - `apps/api/src/modules/auth/auth.routes.ts:20` — `cookieBase` (`httpOnly: true`)
    - `apps/web/src/features/auth/use-me-query.ts:10` — `['auth', 'me']` 캐시 이름표

    **꼬리 질문** — Q. 로그아웃하면 캐시는 어떻게 되나요?
    A. 서버가 쿠키를 지우고 세션을 폐기하며, 프론트는 `['auth', 'me']` 캐시를 즉시 `null`로 덮어씁니다. 둘 다 해야 화면과 서버 상태가 어긋나지 않습니다.

  - 페이지 새로고침 시 로그인 상태는 어떻게 유지되나요?

    **답변**
    메모리에 있던 캐시는 사라지지만 `httpOnly` 쿠키는 브라우저에 남습니다.
    화면이 다시 뜨면서 `useMeQuery`가 `/api/auth/me`를 호출하고, 서버가 쿠키의 `access_token`을 검증해 사용자 정보를 돌려주면 상태가 복구됩니다.
    자료 목록과 상세 페이지는 여기서 한 걸음 더 갑니다. 서버 렌더링 단계에서 `serverApiFetch`가 사용자의 쿠키를 그대로 넘겨 조회하고,
    그 결과를 캐시에 미리 넣어 함께 내려보냅니다. 그래서 첫 화면부터 로그인한 상태로 그려지고, 비로그인 화면이 잠깐 보였다가 바뀌는 깜빡임이 없습니다.

    **근거 코드**
    - `apps/web/src/lib/api/server-api.ts:8` — 사용자 쿠키를 서버 요청에 옮겨 담는 부분
    - `apps/web/src/app/sources/page.tsx:44` — 서버에서 받은 사용자 정보를 캐시에 미리 넣는 부분

    **꼬리 질문** — Q. access 토큰이 이미 만료된 상태로 새로고침하면요?
    A. 첫 요청이 401을 받고 `apiFetch`가 refresh로 갱신한 뒤 다시 시도합니다. refresh까지 만료됐으면 그때 로그인 화면으로 갑니다.

  - 인증이 필요한 페이지 접근은 어떻게 제어하셨나요?

    **답변**
    두 겹으로 나눠서 말씀드리겠습니다.
    프론트에서는 Next.js `middleware.ts`를 두지 않고, 작성 폼과 프로필 화면에서 `useMeQuery` 결과가 비로그인이면 로그인 페이지로 보냅니다.
    `returnTo`를 붙여서 로그인한 뒤 원래 보던 화면으로 돌아오게 했습니다.
    다만 이것은 사용자 경험을 위한 안내이지 보안 장치가 아닙니다.
    실제 차단은 서버에서 합니다. 로그인 여부는 `authenticate`가, 이메일 인증 여부는 `requireVerifiedUser`가,
    남의 글인지는 서비스 계층의 `assertOwner`가 확인합니다.
    화면에서 버튼을 숨겨도 API는 개발자 도구로 직접 부를 수 있기 때문에, 판단은 반드시 서버가 다시 해야 한다고 봤습니다.

    **근거 코드**
    - `apps/web/src/features/sources/source-form.tsx:88` — 비로그인이면 `returnTo`를 붙여 리다이렉트
    - `apps/api/src/middleware/authenticate.ts:6` — 로그인 확인
    - `apps/api/src/middleware/authorize.ts:19` — `requireVerifiedUser` (이메일 인증 확인)
    - `apps/api/src/modules/sources/source.service.ts:326` — `assertOwner` (작성자 확인)

    **꼬리 질문** — Q. Next.js middleware로 막지 않은 이유는 무엇인가요?
    A. 막을 수 있지만 그것도 결국 화면 단의 안내라서, 서버 검증이 모든 쓰기 요청에 빠짐없이 걸려 있는 이상 필수는 아니라고 판단했습니다.

  - 토큰 만료 되면 어떻게 실행되고 있나요?

    **답변**
    access 토큰이 만료되면 서버가 401을 돌려줍니다.
    `apiFetch`가 이것을 받아 `/api/auth/refresh`를 부르고, 서버는 refresh 쿠키를 검증한 뒤 새 access와 새 refresh를 함께 발급합니다.
    이때 쓰던 refresh는 폐기하고 새 것으로 교체하는 **회전** 방식입니다.
    갱신이 끝나면 원래 요청을 한 번만 다시 보내고, refresh까지 만료됐으면 로그인 화면으로 안내합니다.
    여기에 **재사용 탐지**를 넣었습니다. 이미 교체된 refresh가 다시 들어오면 토큰이 탈취된 것으로 보고, 같은 `familyId`를 가진 세션을 전부 폐기합니다.

    **근거 코드**
    - `apps/web/src/lib/api/api-client.ts:68` — 401이면 갱신 후 재시도하는 분기
    - `apps/api/src/modules/auth/auth.service.ts:159` — `refresh` (검증과 회전)
    - `apps/api/src/modules/auth/auth.service.ts:172` — 재사용 탐지 후 family 전체 폐기

    **꼬리 질문** — Q. 요청 여러 개가 동시에 401이면 갱신도 여러 번 나가지 않나요?
    A. `refreshPromise` 하나에 묶어 두어 갱신 요청은 한 번만 나가고, 나머지는 그 결과를 기다렸다가 재시도합니다.

- 회원가입
  - 메일 인증은 어떤 방식으로 하셨나요?

    **답변**
    일회용 토큰이 담긴 링크를 이메일로 보내는 방식입니다.
    토큰 원문은 메일 링크에만 넣고, 데이터베이스에는 해시와 만료 시각만 저장했습니다.
    그래서 데이터베이스가 유출되어도 유효한 링크를 만들 수 없습니다. 유효 기간은 30분입니다.
    사용자가 링크를 누르면 프론트가 토큰을 `/api/auth/verify-email`로 보내고,
    서버가 토큰의 존재 여부와 사용 여부, 만료를 확인합니다.
    통과하면 `usedAt`과 `emailVerifiedAt`을 **한 트랜잭션 안에서** 기록해 인증을 마칩니다.
    재발송하면 이전 토큰을 모두 사용 처리해서, 항상 마지막 링크 하나만 살아 있게 했습니다.

    **근거 코드**
    - `apps/api/src/modules/auth/auth.service.ts:35` — `issueVerification` (해시 저장, 이전 토큰 무효화)
    - `apps/api/src/modules/auth/auth.service.ts:111` — `verifyEmail` (검증과 기록)
    - `apps/api/prisma/schema.prisma:151` — `EmailVerificationToken` (`tokenHash`, `expiresAt`, `usedAt`)

    **꼬리 질문** — Q. 가입되지 않은 이메일로 재발송을 누르면요?
    A. 아무 일도 하지 않고 성공과 똑같이 응답합니다. 응답이 달라지면 어떤 이메일이 가입돼 있는지 알아낼 수 있기 때문입니다.
