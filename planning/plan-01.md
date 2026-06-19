# SourceLink Wiki 기획/설계 문서 생성 프롬프트

너는 지금부터 `SourceLink Wiki` 프로젝트의 기획자이자 풀스택 아키텍트 역할을 맡는다.

이번 단계의 목표는 바로 코드를 구현하는 것이 아니다.
먼저 프로젝트의 목적, 기능 범위, 화면 구성, 데이터 구조, API 구조, 인증 흐름, AI 처리 구조, 구현 우선순위, 리스크를 명확히 정리한 기획/설계 문서를 작성하는 것이다.

절대 바로 기능 구현을 시작하지 마라.
패키지 설치, 프로젝트 생성, DB 마이그레이션, API 구현, 프론트엔드 컴포넌트 구현도 하지 마라.
이번 단계에서는 `docs/` 디렉터리에 Markdown 문서만 생성한다.

---

# 1. 프로젝트 개요

## 1.1 프로젝트명

`SourceLink Wiki`

## 1.2 한 줄 소개

AI 기술 자료 링크를 입력하면 원본 정보를 저장하고, 로컬 LLM으로 요약 초안을 생성하며, 기존 자료들과의 관련 후보를 추천해주는 개인 AI 지식 아카이브 서비스.

## 1.3 핵심 컨셉

SourceLink Wiki는 단순 게시판이나 북마크 서비스가 아니다.

일반 게시판은 사용자가 자유롭게 글을 작성하는 구조지만, SourceLink Wiki는 사용자가 AI 기술 자료를 링크 기반으로 저장하고, 요약하고, 태그화하고, 기존 자료와 연결하여 개인 지식베이스를 구축하는 서비스이다.

핵심 흐름은 다음과 같다.

1. 사용자가 AI 기술 자료 링크를 입력한다.
2. 서버가 원본 URL, 제목, 도메인, 본문 텍스트를 수집하거나 저장한다.
3. 본문 추출에 실패하면 사용자가 직접 원문을 붙여넣을 수 있다.
4. 로컬 LLM이 원본 텍스트를 바탕으로 요약 초안을 생성한다.
5. 핵심 키워드와 추천 태그를 생성한다.
6. 기존 아카이브 자료와의 관련 후보를 추천한다.
7. 사용자가 관련 후보를 확인하고 연결을 저장한다.
8. 자료 상세 화면에서 원본, 요약, 태그, 관련 자료, 댓글을 함께 확인한다.

---

# 2. 과제 배경

이 프로젝트는 프론트엔드 개발자가 백엔드, 데이터베이스, 인증, API, 배포 흐름까지 이해하기 위한 풀스택 과제이다.

과제 필수 조건은 다음과 같다.

* Cloud Server 배포
* Docker 기반 실행 환경
* Backend: Node.js 또는 Python
* DB: PostgreSQL, MySQL, MongoDB 중 하나
* REST API 설계
* Swagger API 문서 제공
* Frontend: Next.js 또는 Nuxt
* GitHub Repository 관리
* GitHub Actions 기반 자동 배포
* JWT 기반 로그인
* 회원가입
* 이메일 중복 검사
* 이메일 인증
* 비밀번호 암호화 저장
* 게시글 CRUD
* 댓글 CRUD
* 본인 작성 글/댓글만 수정 또는 삭제 가능
* 게시글 목록 페이징

이번 프로젝트는 위 과제 조건을 만족하면서, 단순 게시판이 아니라 차별화된 서비스처럼 보이도록 설계해야 한다.

---

# 3. 해결하려는 문제

AI 관련 기술 정보는 너무 많고 빠르게 쌓인다.

사용자는 다음 문제를 겪는다.

1. 좋은 AI 기술 자료를 발견해도 북마크만 하고 다시 보지 않는다.
2. 원본 링크, 요약, 개인 메모가 여러 도구에 흩어진다.
3. 예전에 저장한 자료와 새로 저장한 자료가 어떤 관계인지 알기 어렵다.
4. AI Agent, RAG, LangGraph, MCP, Orchestration 같은 개념들이 서로 연결되어 있지만 직접 정리하기 어렵다.
5. 학습한 자료를 실제 프로젝트에 어떻게 적용할지 기록하기 어렵다.
6. ChatGPT나 NotebookLM에 넣고 요약을 받을 수는 있지만, 자료들이 개인 DB 안에서 지속적으로 누적되고 연결되지는 않는다.

SourceLink Wiki는 이 문제를 해결하기 위해, 사용자가 링크만 입력해도 원본 자료, 요약본, 태그, 관련 자료 후보를 함께 관리할 수 있는 구조를 제공한다.

---

# 4. 핵심 사용자

주요 사용자는 다음과 같다.

* AI 신기술을 꾸준히 학습하는 개발자
* LLM, Agent, RAG, Orchestration, MCP 등에 관심 있는 사람
* 기술 블로그, 공식 문서, 논문, GitHub README를 자주 읽는 사람
* 읽은 자료를 프로젝트에 적용하고 싶은 사람
* 개인 LLM Wiki 또는 AI 지식베이스를 만들고 싶은 사람
* 북마크만으로는 자료 관리가 부족하다고 느끼는 사람

---

# 5. 차별화 포인트

SourceLink Wiki는 다음 4가지를 반드시 핵심 차별화 요소로 가져가야 한다.

## 5.1 링크 기반 자료 등록

사용자는 일반 게시글을 작성하는 것이 아니라, AI 기술 자료의 URL을 입력해 아카이브를 시작한다.

## 5.2 원본 자료/출처 저장

단순 메모가 아니라 출처 기반 아카이브이다.

저장 대상:

* 원본 URL
* 제목
* 도메인
* 자료 유형
* 추출된 본문 또는 사용자가 붙여넣은 원문
* 저장 일시

## 5.3 로컬 LLM 기반 요약

Ollama 기반 로컬 LLM을 활용해 원본 텍스트의 요약 초안을 생성한다.

단, LLM 기능은 서비스 동작의 필수 조건이 아니다.
LLM 서버가 꺼져 있거나 요약 생성이 실패해도 사용자는 자료를 직접 저장하고 요약을 수동으로 작성할 수 있어야 한다.

## 5.4 관련 자료 후보 추천 및 연결 저장

새로 저장한 자료가 기존 자료와 어떻게 연결될 수 있는지 후보를 추천한다.

주의할 점:

* MVP에서는 “자동 연결 확정”이 아니라 “관련 자료 후보 추천”으로 설계한다.
* 사용자가 후보를 확인한 뒤 연결을 저장할 수 있어야 한다.
* 관련 자료 추천은 처음에는 태그/키워드 기반으로 시작한다.
* 고도화 단계에서 embedding + pgvector 기반 유사도 검색으로 확장한다.

---

# 6. 구현 범위 구분

이번 과제에서 모든 기능을 한 번에 구현하지 않는다.
반드시 `Core MVP`, `Differentiation MVP`, `Advanced`를 구분해라.

---

## 6.1 Core MVP

과제 제출을 위해 반드시 구현해야 하는 핵심 기능이다.

* 회원가입
* 이메일 중복 검사
* 이메일 인증
* 로그인
* JWT 인증
* 비밀번호 bcrypt 암호화
* 로그인 사용자 정보 조회
* 자료 CRUD
* 자료 목록 조회
* 자료 상세 조회
* 자료 수정
* 자료 삭제
* 본인이 등록한 자료만 수정/삭제 가능
* 댓글 작성
* 댓글 조회
* 댓글 삭제
* 본인이 작성한 댓글만 삭제 가능
* 자료 목록 페이징
* Swagger API 문서
* Docker 기반 실행 환경
* GitHub Actions 배포 구조

Core MVP는 AI 기능이 없어도 정상 동작해야 한다.

---

## 6.2 Differentiation MVP

일반 게시판과 차별성을 만들기 위해 가능하면 구현해야 하는 기능이다.

* 링크 기반 자료 등록
* 원본 URL 저장
* 제목 저장
* 도메인 저장
* 자료 유형 저장
* 원문 텍스트 저장
* URL 본문 추출
* URL 추출 실패 시 수동 본문 붙여넣기
* 로컬 LLM 기반 요약 초안 생성
* 핵심 키워드 생성
* 추천 태그 생성
* 태그/키워드 기반 관련 자료 후보 추천
* 사용자가 관련 자료 후보를 확인하고 연결 저장

---

## 6.3 Advanced

과제 이후 확장 가능한 고도화 기능이다.

* 임베딩 기반 유사 자료 검색
* PostgreSQL pgvector 기반 벡터 저장 및 유사도 검색
* LLM 기반 관계 유형 설명 생성
* PDF 업로드 및 요약
* YouTube 자막 기반 요약
* 자료 기반 질의응답
* 지식 그래프 시각화
* 프로젝트별 자료 묶음 관리
* 브라우저 확장 프로그램 기반 링크 저장
* 주간 AI 자료 digest 생성

---

# 7. 중요한 설계 원칙

다음 원칙을 반드시 지켜라.

1. LLM이 URL을 직접 읽는 구조로 설계하지 마라.
2. 백엔드가 URL에 접근해 본문을 추출하고, 추출된 텍스트를 LLM에 전달하는 구조로 설계해라.
3. LLM 기능이 실패해도 기본 CRUD 기능은 정상 동작해야 한다.
4. LLM 기능은 필수 기능이 아니라 선택 기능으로 분리해라.
5. 배포 환경에서 로컬 LLM 실행이 어렵다면 Mock 응답 또는 비활성화 전략을 문서화해라.
6. 원본 HTML 전체 저장은 기본값으로 하지 마라.
7. MVP에서는 정제된 텍스트 중심으로 저장하고, 최대 저장 길이를 제한해라.
8. 관련 자료 연결은 MVP에서 자동 확정이 아니라 후보 추천으로 설계해라.
9. 사용자가 관련 자료 후보를 확인하고 연결을 저장할 수 있게 해라.
10. 프론트엔드는 일반 게시판처럼 보이지 않게, 자료 아카이브와 지식 연결이 드러나는 UI로 설계해라.
11. 과제 평가 질문에 답하기 쉽도록 인증, 상태관리, API 호출, 에러 처리, 토큰 관리, DB 관계를 명확히 문서화해라.
12. 각 기능별 Acceptance Criteria를 작성해라.

---

# 8. 추천 기술 스택

아래 스택을 기본 가정으로 설계해라.

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Zustand 또는 TanStack Query

## Backend

* Node.js
* Express.js
* Prisma

## Database

* PostgreSQL

## Auth

* JWT Access Token
* bcrypt
* 이메일 인증 토큰

## API Docs

* Swagger / OpenAPI

## AI Processing

* Ollama 기반 로컬 LLM
* 기본 후보 모델은 Gemma 계열로 가정
* 모델명은 하드코딩하지 않고 환경변수로 관리
* 배포 환경에서는 Mock 처리 또는 비활성화 가능

환경변수 예시:

```txt
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma
ENABLE_AI_FEATURES=true
ENABLE_URL_EXTRACTION=true
```

## Infra

* Docker
* Docker Compose
* GitHub Actions
* AWS Free Tier

---

# 9. 화면 구성 문서 작성 요구사항

다음 화면을 기준으로 화면 기획을 작성해라.

---

## 9.1 로그인 화면

포함 요소:

* 이메일 입력
* 비밀번호 입력
* 로그인 버튼
* 회원가입 이동
* 에러 메시지

설명해야 할 것:

* 로그인 성공 시 토큰 처리
* 로그인 상태 유지 방식
* 인증이 필요한 페이지 접근 제어 방식
* 토큰 만료 시 처리 방식

---

## 9.2 회원가입 화면

포함 요소:

* 이메일
* 닉네임
* 비밀번호
* 비밀번호 확인
* 회원가입 버튼
* 이메일 인증 안내

설명해야 할 것:

* 이메일 중복 검사
* 이메일 인증 흐름
* 비밀번호 암호화 저장
* Development mode와 Production-ready mode의 이메일 인증 차이

---

## 9.3 대시보드 화면

일반 게시판 목록처럼 만들지 말고, 개인 AI 지식 아카이브 느낌이 나도록 구성해라.

포함 요소:

* 저장한 자료 수
* 요약 완료 자료 수
* 연결된 자료 수
* 최근 저장한 자료
* 최근 연결된 자료
* 자주 사용한 태그
* AI 기능 활성화 여부
* 빠른 링크 등록 입력창

---

## 9.4 자료 목록 화면

카드형 UI로 설계해라.

각 카드에 포함할 정보:

* 자료 제목
* 원본 도메인
* 자료 유형
* 요약 일부
* 태그
* 관련 자료 수
* 댓글 수
* 저장일
* 상태

목록 기능:

* 검색
* 태그 필터
* 상태 필터
* 페이지네이션
* 새 자료 등록 버튼

---

## 9.5 자료 등록 화면

핵심 UX는 “링크 하나로 시작”이다.

포함 요소:

* URL 입력
* 자료 가져오기 버튼
* 제목
* 도메인
* 본문 미리보기
* 원문 직접 붙여넣기 영역
* 태그
* 개인 메모
* 저장 버튼
* AI 요약 버튼

중요한 fallback UX:

* URL 본문 추출 성공 시 제목/도메인/본문 미리보기를 자동 입력한다.
* URL 본문 추출 실패 시 원본 URL만 저장 가능해야 한다.
* 사용자가 직접 본문을 붙여넣고 AI 요약을 실행할 수 있어야 한다.

---

## 9.6 AI 처리 중 화면

AI 요약 기능이 실행될 때 사용자에게 진행 단계를 보여주는 화면을 설계해라.

예시 단계:

* 원본 링크 확인 중
* 본문 추출 중
* 요약 생성 중
* 추천 태그 생성 중
* 관련 자료 후보 찾는 중

LLM 서버 연결 실패 시:

* 에러 메시지를 보여준다.
* 자료 저장은 계속 가능해야 한다.
* 사용자가 직접 요약을 입력할 수 있어야 한다.

---

## 9.7 자료 상세 화면

이 서비스의 핵심 화면이다.

포함 요소:

* 제목
* 원본 링크
* 도메인
* 저장일
* 태그
* AI 요약
* 핵심 포인트
* 원본 본문
* 개인 메모
* 관련 자료 목록
* 댓글
* 수정 버튼
* 삭제 버튼

관련 자료 목록에는 다음 정보를 포함해라.

* 관련 자료 제목
* 관련도
* 관계 유형
* 관계 이유
* 사용자가 연결한 자료인지, 시스템이 추천한 후보인지 구분

---

## 9.8 관련 자료 후보 확인 화면

차별화 핵심 화면이다.

포함 요소:

* 새 자료 제목
* 추천된 관련 자료 목록
* 관련도 점수
* 공통 태그
* 공통 키워드
* 관계 유형 선택
* 관계 메모 입력
* 연결 저장 버튼
* 후보 제외 버튼

MVP에서는 시스템이 후보만 추천하고, 사용자가 최종 연결을 저장하는 구조로 설계해라.

---

## 9.9 자료 수정 화면

포함 요소:

* 제목 수정
* 요약 수정
* 태그 수정
* 개인 메모 수정
* 상태 수정
* 관련 자료 수정

본인이 등록한 자료만 수정 가능해야 한다.

---

## 9.10 마이페이지

포함 요소:

* 내 정보
* 저장한 자료 수
* 작성한 댓글 수
* 가장 많이 사용한 태그
* 최근 저장한 자료
* AI 요약 사용 횟수
* 연결된 자료 수

---

# 10. 데이터베이스 설계 문서 작성 요구사항

다음 테이블을 기준으로 DB 설계 초안을 작성해라.

---

## 10.1 users

사용자 정보를 저장한다.

필드 예시:

* id
* email
* password_hash
* nickname
* email_verified
* created_at
* updated_at

---

## 10.2 email_verification_tokens

이메일 인증 토큰을 저장한다.

필드 예시:

* id
* user_id
* token
* expires_at
* used_at
* created_at

Development mode에서는 실제 이메일 발송 대신 인증 URL을 서버 로그에 출력할 수 있도록 설계해라.

---

## 10.3 sources

사용자가 저장한 AI 자료를 저장한다.

필드 예시:

* id
* user_id
* title
* original_url
* source_domain
* source_type
* raw_text
* raw_text_preview
* summary
* key_points
* keywords
* ai_note
* application_idea
* status
* extraction_status
* summary_status
* created_at
* updated_at

주의:

* raw_text는 최대 저장 길이를 제한하는 정책을 문서화해라.
* 원본 HTML 전체 저장은 MVP 기본 범위에서 제외해라.

---

## 10.4 comments

자료에 작성된 댓글을 저장한다.

필드 예시:

* id
* source_id
* user_id
* content
* created_at
* updated_at

---

## 10.5 tags

태그 정보를 저장한다.

필드 예시:

* id
* name
* created_at

---

## 10.6 source_tags

자료와 태그의 다대다 관계를 관리한다.

필드 예시:

* source_id
* tag_id

---

## 10.7 source_links

자료 간 연결 관계를 저장한다.

필드 예시:

* id
* source_id
* linked_source_id
* similarity_score
* relation_type
* relation_reason
* created_by
* created_at

created_by 예시:

* user
* system_suggested
* ai_suggested

주의:

* MVP에서는 자동 저장보다 후보 추천 후 사용자 확인 저장을 기본으로 설계해라.

---

## 10.8 관계 설명

관계는 반드시 다음 형식으로 명확하게 작성해라.

* users 1:N sources
* users 1:N comments
* sources 1:N comments
* sources N:M tags through source_tags
* sources N:M sources through source_links

---

# 11. REST API 설계 문서 작성 요구사항

다음 API를 기준으로 REST API 설계를 작성해라.

각 API에 대해 다음 내용을 작성한다.

* 목적
* 요청 파라미터
* 요청 Body
* 응답 Body
* 인증 필요 여부
* 권한 처리
* 주요 에러 케이스
* Acceptance Criteria

---

## 11.1 Auth API

* POST /api/auth/signup
* POST /api/auth/login
* GET /api/auth/me
* POST /api/auth/verify-email
* POST /api/auth/resend-verification

---

## 11.2 Source API

* POST /api/sources
* GET /api/sources
* GET /api/sources/:id
* PATCH /api/sources/:id
* DELETE /api/sources/:id

---

## 11.3 AI Processing API

* POST /api/sources/:id/extract
* POST /api/sources/:id/summarize
* POST /api/sources/:id/link-candidates

주의:

* `/link-candidates`는 관련 자료 후보를 추천하는 API이다.
* 후보를 바로 source_links에 확정 저장하지 않는다.
* 사용자가 확인 후 별도 API로 연결 저장한다.

추가 API:

* POST /api/sources/:id/links
* DELETE /api/source-links/:id

---

## 11.4 Comment API

* POST /api/sources/:id/comments
* GET /api/sources/:id/comments
* DELETE /api/comments/:id

---

## 11.5 Tag API

* GET /api/tags
* POST /api/tags

---

# 12. 프론트엔드 상태관리 설계 요구사항

프론트엔드 상태관리에 대해 다음 내용을 문서화해라.

* 어떤 상태를 전역 상태로 관리할 것인가
* 로그인 상태는 어디에 저장할 것인가
* access token은 어떻게 관리할 것인가
* 새로고침 시 로그인 상태는 어떻게 복구할 것인가
* 인증이 필요한 페이지는 어떻게 보호할 것인가
* API 에러는 어떻게 공통 처리할 것인가
* 토큰 만료 시 어떻게 처리할 것인가
* AI 처리 상태는 전역 상태로 관리할 것인가, 지역 상태로 관리할 것인가
* 자료 목록 캐싱은 어떻게 처리할 것인가

추천 구조:

* auth store
* API client wrapper
* route guard 또는 middleware
* 공통 에러 핸들러
* source query hooks
* AI processing state

JWT 저장 방식은 다음 두 가지를 비교하고, MVP에서 하나를 선택해라.

1. localStorage + Authorization header
2. HttpOnly Cookie

각 방식의 장단점, 구현 난이도, 보안 리스크를 비교한 뒤 MVP 선택안을 문서화해라.

---

# 13. API 호출 구조 설계 요구사항

다음 내용을 문서화해라.

* API 요청은 fetch 또는 axios 중 무엇을 사용할 것인가
* 공통 API 클라이언트는 어디에 둘 것인가
* Authorization header는 어떻게 자동으로 붙일 것인가
* 401 에러 발생 시 어떻게 처리할 것인가
* API 응답 타입은 어떻게 관리할 것인가
* 서버 에러와 validation 에러를 UI에 어떻게 표시할 것인가
* AI 처리 API는 일반 CRUD API와 어떻게 분리할 것인가
* 긴 작업 처리 중 loading/progress 상태는 어떻게 표현할 것인가

---

# 14. AI 처리 설계 요구사항

AI 처리 구조를 반드시 별도 문서로 정리해라.

다음 내용을 포함해라.

## 14.1 URL 처리

* LLM이 URL을 직접 읽지 않는 이유
* 백엔드가 URL 본문을 먼저 추출해야 하는 이유
* URL 본문 추출 방식
* 본문 추출 실패 시 처리 방식
* 사용자가 직접 raw_text를 붙여넣는 fallback UX
* JavaScript 렌더링 페이지, 로그인 필요 페이지, paywall 페이지에 대한 한계

## 14.2 LLM 요약

* 너무 긴 본문을 어떻게 자를 것인가
* LLM 요약 프롬프트 구조
* 요약 결과 JSON 스키마
* JSON 파싱 실패 시 처리
* LLM 응답 품질이 낮을 때 사용자가 수정할 수 있는 구조
* 로컬 Ollama 서버가 꺼져 있을 때 fallback 처리
* 배포 환경에서 LLM 기능을 Mock으로 대체하는 방식

요약 결과 예시 JSON:

```json
{
  "summary": "자료의 핵심 내용을 3~5문장으로 요약",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2"],
  "keywords": ["Agent", "RAG"],
  "recommendedTags": ["Agent", "Memory", "RAG"],
  "applicationIdea": "이 자료를 프로젝트에 어떻게 적용할 수 있는지에 대한 아이디어"
}
```

## 14.3 관련 자료 후보 추천

* MVP에서는 태그/키워드 기반으로 관련 후보를 추천한다.
* 같은 태그가 많은 자료를 우선 추천한다.
* 제목/요약/키워드가 겹치는 자료를 추천한다.
* 관련도 점수를 단순 계산한다.
* 사용자가 관련 후보를 확인한 뒤 연결을 저장한다.

## 14.4 고도화 방향

* 각 자료의 본문 또는 요약을 embedding으로 변환
* PostgreSQL pgvector에 저장
* 새 자료 저장 시 유사도 검색
* 상위 N개 후보를 가져옴
* LLM이 관계 유형과 이유를 생성

관계 유형 예시:

* related
* prerequisite
* comparison
* extension
* contradiction
* applied_case

---

# 15. 보안 및 권한 설계 요구사항

다음 내용을 문서화해라.

## 15.1 인증/인가

* 비밀번호는 bcrypt로 해시 저장
* JWT에 포함할 정보
* JWT 만료 시간
* 인증이 필요한 API
* 본인 자료만 수정/삭제 가능하게 하는 방식
* 본인 댓글만 삭제 가능하게 하는 방식
* 본인이 만든 자료 연결만 삭제할 수 있게 하는 방식

## 15.2 URL 입력 보안

URL 입력 기능에는 SSRF 위험이 있다.
다음 방어 전략을 문서화해라.

* 허용 프로토콜은 http, https만 허용
* localhost 차단
* 127.0.0.1 차단
* 0.0.0.0 차단
* 사설 IP 대역 차단
* file://, ftp:// 등 차단
* 외부 URL 요청 timeout 처리
* redirect 횟수 제한
* 최대 응답 본문 크기 제한
* Content-Type 확인
* 너무 큰 본문 저장 방지

---

# 16. 이메일 인증 설계 요구사항

이메일 인증은 다음 두 모드로 나누어 설계해라.

## 16.1 Development mode

* 실제 이메일을 보내지 않는다.
* 인증 토큰 또는 인증 URL을 서버 로그에 출력한다.
* 사용자는 해당 URL로 인증을 완료할 수 있다.
* 과제 개발/시연에서 사용할 수 있다.

## 16.2 Production-ready mode

* SMTP 또는 이메일 발송 서비스를 붙일 수 있도록 service layer를 분리한다.
* 실제 이메일 발송 구현은 선택 기능으로 둔다.
* 이메일 인증 API 구조는 실제 서비스로 확장 가능하게 설계한다.

---

# 17. 에러 처리 설계 요구사항

다음 에러 케이스를 문서화해라.

* 이메일 중복
* 이메일 인증 미완료
* 로그인 실패
* 토큰 만료
* 권한 없음
* 존재하지 않는 자료
* URL 형식 오류
* 차단된 URL
* 본문 추출 실패
* LLM 서버 연결 실패
* 요약 생성 실패
* 관련 후보 추천 실패
* 댓글 삭제 권한 없음
* DB 저장 실패

각 에러에 대해 다음을 정리해라.

* HTTP Status Code
* 서버 응답 메시지
* 프론트엔드 표시 방식
* 사용자가 다음에 할 수 있는 행동

---

# 18. Acceptance Criteria 작성 요구사항

각 핵심 기능마다 완료 기준을 작성해라.

예시:

## 인증

* 사용자는 이메일, 닉네임, 비밀번호로 회원가입할 수 있다.
* 이미 가입된 이메일로 회원가입할 수 없다.
* 비밀번호는 평문으로 저장되지 않는다.
* 이메일 인증 전에는 로그인 또는 자료 등록이 제한된다.
* 로그인 성공 시 access token이 발급된다.

## 자료

* 로그인 사용자는 URL과 제목을 입력해 자료를 등록할 수 있다.
* URL 본문 추출에 실패해도 원본 URL과 수동 입력 본문으로 자료를 저장할 수 있다.
* 사용자는 본인이 등록한 자료만 수정할 수 있다.
* 사용자는 본인이 등록한 자료만 삭제할 수 있다.
* 자료 목록은 page, limit 기준으로 페이징된다.

## 댓글

* 로그인 사용자는 자료 상세에서 댓글을 작성할 수 있다.
* 사용자는 본인이 작성한 댓글만 삭제할 수 있다.

## AI

* LLM 서버가 정상 동작하면 원문 기반 요약 초안을 생성할 수 있다.
* LLM 서버가 꺼져 있어도 자료 저장은 가능해야 한다.
* AI 요약 결과는 사용자가 수정할 수 있다.

## 관련 자료

* 시스템은 태그/키워드 기반 관련 자료 후보를 추천할 수 있다.
* 관련 자료 후보는 자동 확정 저장되지 않는다.
* 사용자가 확인한 관련 자료만 연결 저장된다.

---

# 19. 프로젝트 폴더 구조 제안 요구사항

모노레포 또는 분리 구조 중 적절한 구조를 제안해라.

예시:

```txt
apps/web
apps/api
packages/shared
docker-compose.yml
docs
```

각 폴더의 역할을 설명해라.

---

# 20. 산출물 요구사항

이번 기획 단계에서 실제로 생성해야 할 문서는 다음과 같다.

다음 파일들을 `docs/` 디렉터리에 생성해라.

---

## 20.1 docs/01-product-brief.md

포함 내용:

* 프로젝트 개요
* 문제 정의
* 핵심 사용자
* 핵심 가치
* 차별화 포인트
* 기대효과
* 일반 게시판과의 차이

---

## 20.2 docs/02-requirements.md

포함 내용:

* Core MVP
* Differentiation MVP
* Advanced
* 기능별 우선순위
* 기능별 Acceptance Criteria

---

## 20.3 docs/03-screen-plan.md

포함 내용:

* 화면 목록
* 각 화면의 목적
* 주요 UI 요소
* 사용자 흐름
* fallback UX
* AI 처리 중 화면
* 관련 자료 후보 확인 화면

---

## 20.4 docs/04-database-design.md

포함 내용:

* 테이블 구조
* 필드 정의
* 관계 설명
* 권한 처리와의 연결
* source_links 설계
* raw_text 저장 정책

---

## 20.5 docs/05-api-design.md

포함 내용:

* REST API 목록
* 요청/응답 구조
* 인증 필요 여부
* 권한 처리
* 에러 케이스
* Acceptance Criteria

---

## 20.6 docs/06-frontend-architecture.md

포함 내용:

* 상태관리 구조
* API 호출 구조
* 인증 처리
* 에러 처리
* 페이지 보호 방식
* 토큰 저장 방식 비교
* AI 처리 상태 관리

---

## 20.7 docs/07-backend-architecture.md

포함 내용:

* Express 서버 구조
* 인증 미들웨어
* 서비스/컨트롤러 분리
* Prisma 사용 방식
* Swagger 구성
* 이메일 인증 service layer
* URL extraction service
* AI processing service

---

## 20.8 docs/08-ai-processing-design.md

포함 내용:

* URL 본문 추출
* 본문 추출 실패 fallback
* LLM 요약 처리
* 요약 프롬프트 구조
* 요약 결과 JSON 스키마
* 관련 자료 후보 추천
* Mock 처리 전략
* 고도화 방향

---

## 20.9 docs/09-development-roadmap.md

포함 내용:

* 구현 순서
* Phase별 마일스톤
* Core MVP 우선 구현 전략
* Differentiation MVP 구현 전략
* 리스크 Top 5
* 과제 제출 최소 범위

---

## 20.10 docs/10-presentation-summary.md

포함 내용:

* 발표용 한 줄 소개
* 문제 정의
* 해결 방식
* 기술 구현 요약
* 차별화 포인트
* 과제 요구사항 매핑
* 향후 확장 방향
* 예상 질문과 답변

예상 질문에는 반드시 다음을 포함해라.

* JWT 토큰에는 어떤 정보를 포함했는가?
* DB 테이블 관계는 어떻게 설계했는가?
* 상태관리는 무엇을 사용했고 이유는 무엇인가?
* API 요청은 어디서 공통 관리하는가?
* 인증 토큰은 어떻게 전달하는가?
* 새로고침 시 로그인 상태는 어떻게 유지되는가?
* 인증이 필요한 페이지는 어떻게 보호하는가?
* 토큰 만료 시 어떻게 처리하는가?
* 이메일 인증은 어떤 방식으로 구현했는가?
* LLM 기능이 실패하면 어떻게 처리하는가?
* URL 본문 추출이 실패하면 어떻게 처리하는가?
* 관련 자료 연결은 자동인가, 사용자가 확인하는가?

---

# 21. 구현 로드맵 작성 기준

`docs/09-development-roadmap.md`에는 다음 순서로 구현 로드맵을 작성해라.

## Phase 1. 프로젝트 기반 세팅

* 모노레포 구조
* Next.js 앱
* Express API 서버
* PostgreSQL
* Prisma
* Docker Compose
* 환경변수 구조

## Phase 2. 인증

* 회원가입
* 이메일 중복 검사
* 이메일 인증
* 로그인
* JWT 인증
* auth middleware
* 프론트 로그인 상태관리

## Phase 3. Core CRUD

* sources CRUD
* comments CRUD
* 페이징
* 권한 체크
* Swagger 문서

## Phase 4. SourceLink 차별화 기능

* URL 기반 자료 등록
* URL 본문 추출
* 추출 실패 fallback
* 자료 상태 관리
* 태그
* 관련 자료 후보 추천

## Phase 5. AI 요약

* Ollama 연결
* LLM 요약 프롬프트
* 요약 결과 저장
* 추천 태그 저장
* AI 실패 fallback
* 배포 환경 Mock 전략

## Phase 6. 배포

* Docker 정리
* GitHub Actions
* AWS Free Tier 배포
* 환경변수 설정
* Swagger URL 확인
* 제출용 README 정리

---

# 22. 최종 작성 방식

문서는 한국어로 작성해라.

각 문서는 실제 개발자가 바로 구현 단계로 넘어갈 수 있을 정도로 구체적이어야 한다.

단, 지금 단계에서는 실제 코드를 구현하지 마라.
패키지 설치, 프로젝트 생성, DB 마이그레이션, API 구현, 프론트엔드 컴포넌트 구현은 하지 마라.

반드시 먼저 문서만 생성해라.

문서를 작성한 뒤 마지막에 다음 내용을 요약해라.

1. 이 프로젝트의 핵심 컨셉
2. 과제 필수 요구사항과 매핑되는 부분
3. 차별화 핵심 기능
4. 구현 시 가장 먼저 해야 할 일
5. 구현 리스크 Top 5
6. 다음 단계에서 Codex에게 줄 구현 프롬프트 방향

---

# 23. 최종 요청

위 요구사항을 바탕으로 `SourceLink Wiki` 프로젝트의 기획/설계 문서를 작성해라.

지금은 구현하지 말고, `docs/` 디렉터리의 Markdown 문서 생성만 수행해라.
