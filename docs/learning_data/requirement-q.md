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
  사용자 식별 sub, access,refresh를 구분하는 type,  
  token과 session을 식별하는 jti, 발급자, 대상, 발급 시간, 만료시간 사용.  
  access token 15분, refresh token 14일

### Database

- 테이블 관계
  - 테이블 간 관계를 어떤 기준으로 설계하셨나요?

### Frontend

- Store 상태관리
  - 상태 관리는 어떤 라이브러리를 사용하셨나요?
  - 어떤 데이터들을 상태 관리로 관리하셨나요?
  - 상태관리 라이브러리를 선택한 이유는 무엇인가요?
- API 연동
  - API 요청은 어떤 방식으로 호출하셨나요?
  - API 호출 로직은 어떤 위치에서 관리하고 있나요?
  - 공통 API 요청 처리를 위해 어떤 구조를 사용하셨나요?
  - API 요청 시 인증 토큰은 어떻게 전달하셨나요?
- 에러 처리
  - 프론트엔드에서 API 에러는 어떻게 처리하셨나요?  
  &gt; 프론트엔드 API 에러는 공통 apiFetch에서 처리했습니다.  
  Backend의 오류 응답을 ApiError로 변환해 status, code, message, fieldErrors,requestId를 일관되게 관리했습니다.  
  각 화면에서는 fieldErrors를 해당 입력칸에 표시하고, 일반 오류는 폼 상단에 보여줍니다.  
  401 오류가 발생하면 refresh token으로 세션을 갱신한 뒤 원래 요청을 한 번 재시도하고, 갱신에도 실패하면 다시 로그인하도록 처리했습니다.  
    
    
  - 공통 에러 처리를 위해 어떤 구조를 사용하셨나요?  
  apiFetch라는 api wrapper를 만들고, 모든 feature API가 이를 사용하도록 구성.  
  backend의 다양한 오류 응답은 ApiError 클래스로 변환해서 status, code, message, fieldErros, requestId를 공통형식으로 관리했다.  
  
- 로그인
  - 로그인 상태 확인은 어떤 방식으로 처리하셨나요?  
  &gt; 로그인 상태는 Frontend에서 임의의 값을 확인하
  
      &gt; 는 방식이 아니라, TanStack Query의 useQuery를
  
      &gt; 활용한 useMeQuery Hook으로 확인했습니다.
  
      &gt; useMeQuery가 [authApi.me](http://authApi.me)()를 통해 GET /api/
  
      &gt; auth/me를 호출하면, Backend가 HttpOnly 쿠키의
  
      &gt; access_token을 검증합니다. 사용자 정보가 반환
  
      &gt; 되면 로그인 상태로 처리하고, 401 응답이면 비
  
      &gt; 로그인 상태인 null로 처리했습니다.  
  - 로그인 상태는 어디에 저장하셨나요?  
  &gt; 인증에 필요한 access token과 refresh token은
  
      &gt; 서버가 HttpOnly cookie로 관리했습니다.
  
      &gt; Frontend에서는 JWT 원문을 저장하지 않고,
  
      &gt; useMeQuery를 통해 /api/auth/me에서 받은 현재
  
      &gt; 사용자 정보를 TanStack Query의 ['auth', 'me']
  
      &gt; cache로 관리했습니다. 새로고침하면 쿠키를 이
  
      &gt; 용해 /api/auth/me를 다시 호출하고 사용자 정보
  
      &gt; 를 복구합니다.  
  - 페이지 새로고침 시 로그인 상태는 어떻게 유지되나요?  
  브라우저의 HttpOnly cookie 는 유지되고, useMeQuery가 /api/auth/me를 호출해 Backend에서 access token을 검증합니다.  
  
    
  - 인증이 필요한 페이지 접근은 어떻게 제어하셨나요?  
  Frontend에서 로그인 여부를 확인해 redirect하고, Backend에서 authenticate, requireVerifiedUser, 소유권 검사를 통해 최종 권한을 검증
  
    
  - 토큰 만료 되면 어떻게 실행되고 있나요?  
  401 응답 -&gt; refresh token 을 backend로 보냄 -&gt; 새 access token 발급 -&gt; 새 refresh token도 발급 -&gt; 원래 요청 시도
- 회원가입
  - 메일 인증은 어떤 방식으로 하셨나요?  
  일회용 token이 포함된 링크를 이메일로 발송하는 방식으로 구현했습니다.  
  회원가입시 token 원문은 이메일 링크에만 넣고,  
  DB에는 token hash와 만료 시간을 저장했습니다.  
  사용자가 링크를 클릭하면 Frontend가 token을 /api/auth/verify-email로 전달하고, Backend가 token의 유효성·만료 여부·사용 여부를 확인합니다.
  
    검증에 성공하면 usedAt과 emailVerifiedAt을 기록해 이메일 인증을 완료합니다

