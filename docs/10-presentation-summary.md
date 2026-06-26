# 발표 및 제출 요약

## 서비스 소개

SourceLink Wiki는 AI 기술 자료 링크를 출처·정제 본문·요약·메모와 함께 공개적으로 축적하는 지식 아카이브다. 일반 게시판의 CRUD를 링크 중심 UX로 재해석했고, 로컬 LLM은 실패해도 서비스 핵심 흐름을 막지 않는 보조 도구로 설계했다.

## 문제와 해결

- 북마크만으로는 자료의 핵심 내용과 학습 맥락이 남지 않는다.
- URL을 입력하면 백엔드가 안전하게 본문을 추출하고 사용자가 검토한다.
- Ollama가 요약 초안을 생성하며 사용자가 수정 후 저장한다.
- 원본 링크와 공개 댓글을 함께 유지해 출처 기반 학습 기록을 만든다.

## 기술 요약

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| Frontend | Next.js, TypeScript, TanStack Query, Zustand | 서버/클라이언트 상태 분리와 공개 페이지 초기 렌더링 |
| Backend | Express, Prisma, Zod | REST 흐름과 계층 책임을 명확히 학습 |
| DB | PostgreSQL | 사용자·자료·댓글·태그 관계와 transaction 표현 |
| Auth | JWT access/refresh HttpOnly cookie | 새로고침 유지, 회전·폐기 가능한 세션 |
| AI | 로컬 Ollama | 원문 외부 전송 없이 선택적 요약 |
| Infra | EC2, Docker Compose, GitHub Actions | 단일 VM에서 전체 배포 흐름 경험 |

## 과제 요구사항 매핑

- 로그인·JWT: access 15분, refresh 14일, cookie, 회전과 재사용 탐지
- 회원가입: 중복 검사, bcrypt, 일회용 실제 이메일 인증
- 게시글: Source 자료의 공개 조회와 작성자 CRUD
- 댓글: 공개 조회와 작성자 작성·수정·삭제
- 페이징: PostgreSQL count와 `page/limit`, 안정적 최신순 정렬
- REST·Swagger: Express API와 `/api/docs`
- Frontend: Next.js 화면, Query 캐시, API client, 공통 오류
- Docker·Cloud·GitHub: EC2 Compose와 main 자동 배포

## 예상 질문과 답변

### JWT에는 어떤 정보를 포함했나요?

사용자 식별자 `sub`, token 용도 `type`, 고유 ID `jti`, 발급·만료 시각 `iat`, `exp`만 포함했다. 이메일과 닉네임은 바뀔 수 있고 token 크기·노출 범위를 늘리므로 넣지 않았다.

### 토큰은 어떻게 전달하고 어디에 저장하나요?

서버가 access와 refresh JWT를 HttpOnly cookie로 설정하고 브라우저가 같은 origin API 요청에 자동 전송한다. JavaScript와 Zustand/localStorage에는 token을 저장하지 않는다. Secure, SameSite와 mutation Origin 검사를 적용한다.

### 새로고침 시 로그인은 어떻게 유지하나요?

앱이 `/api/auth/me`를 호출해 HttpOnly access cookie를 검증하고 사용자 Query를 복구한다. access가 만료됐으면 API client가 refresh를 한 번 수행한 뒤 원 요청을 재시도한다.

### 토큰 만료 시 어떻게 동작하나요?

동시 401은 single-flight refresh 하나로 합친다. refresh 성공 시 cookie를 회전하고 요청을 한 번 재시도한다. 실패·만료·재사용 탐지 시 세션을 폐기하고 로그인으로 이동한다.

### 인증 페이지는 어떻게 보호하나요?

middleware의 cookie 존재 확인은 UX redirect에만 사용한다. 실제 인증과 이메일 인증 여부는 API middleware가 검증하고, 수정·삭제는 service가 DB 작성자 ID까지 비교한다.

### 상태관리는 무엇을 사용하고 무엇을 담나요?

TanStack Query가 사용자·자료·댓글 같은 서버 상태와 캐시를 관리한다. Zustand는 여러 컴포넌트가 공유하는 dialog·작성 UI 같은 최소 클라이언트 상태만 담당한다. 서버 데이터를 store에 복제하지 않는다.

### API 요청은 어디서 공통 관리하나요?

`lib/api`의 typed fetch wrapper가 base URL, JSON, cookie, timeout, 오류 parsing과 401 refresh를 관리한다. 기능별 query/mutation hook은 이 client를 사용하고 공유 Zod DTO로 계약을 맞춘다.

### API 에러는 어떻게 처리하나요?

서버가 status와 안정적인 `code`, 사용자용 `message`, `fieldErrors`, `requestId`를 반환한다. validation은 필드에, 권한·네트워크·서버 오류는 유지되는 alert와 가능한 다음 행동으로 표시한다.

### DB 관계는 어떻게 설계했나요?

users는 sources·comments와 1:N, sources는 comments와 1:N, sources와 tags는 source_tags를 통한 N:M이다. 이메일 token과 refresh session도 사용자 1:N이며, FK와 unique/index/cascade 정책으로 무결성과 조회 경로를 보장한다.

### 본인 글과 댓글만 변경하게 한 방법은 무엇인가요?

화면에서 owner action을 숨기는 것은 UX일 뿐이다. 서버 service가 인증 사용자 ID와 `user_id`를 비교하고 가능하면 UPDATE/DELETE 조건에 ID와 사용자 ID를 함께 넣는다. 타인은 403을 받는다.

### 이메일 인증은 어떻게 구현했나요?

32-byte random token 원문은 이메일에만 보내고 DB에는 SHA-256 hash와 만료·사용 시각을 저장한다. production은 SMTP adapter, development는 Mailpit/console adapter를 사용한다. 토큰은 일회용이며 재발송 시 기존 토큰을 폐기한다.

### URL을 왜 LLM이 직접 읽지 않나요?

네트워크 접근과 SSRF 방어, 응답 크기, MIME, redirect를 서버가 통제해야 하기 때문이다. 서버가 공개 HTTP(S)만 받아 정제 텍스트로 만든 뒤 제한된 내용만 Ollama에 전달한다.

### URL 추출이 실패하면 어떻게 하나요?

폼과 URL을 유지하고 이유를 표시한다. 사용자는 URL과 제목만 저장하거나 원문을 직접 붙여넣을 수 있다. JS 렌더링·로그인·paywall 페이지는 MVP 한계로 안내한다.

### LLM이 실패하면 어떻게 하나요?

AI 호출과 CRUD transaction을 분리했다. timeout·연결 실패·잘못된 JSON이어도 기존 자료는 바뀌지 않고 사용자가 직접 요약할 수 있다. 배포 환경은 AI를 끄거나 demo임이 명시된 fixture를 사용한다.

### 관련 자료 연결은 자동인가요?

제출 버전에는 포함하지 않는다. 후속 버전에서도 시스템은 후보만 추천하고 사용자가 확인한 관계만 저장한다.

### 댓글 수정이 기능 목록에는 없는데 왜 구현했나요?

과제 설명에 본인 댓글만 “수정/삭제”할 수 있어야 한다고 명시되어 있어 더 강한 요구를 기준으로 PATCH와 수정 UI를 포함했다.

## 시연 순서

1. 비회원 자료 목록·상세와 페이징
2. 가입과 실제 인증 메일, 로그인
3. URL 본문 추출 실패·성공 fallback
4. 자료 생성·수정과 다른 사용자 권한 차단
5. 댓글 생성·수정·삭제와 소유권
6. 로컬 Ollama 요약 검토·적용, Ollama 중단 fallback
7. Swagger와 GitHub Actions 배포 결과

## 제출 체크리스트

- GitHub Repository URL
- HTTPS 배포 서비스 URL
- Swagger API 문서 URL
  - 로컬 확인: `http://localhost:4000/api/docs`
  - 배포 후 제출: `https://<domain>/api/docs/`
- OpenAPI JSON URL
  - 로컬 확인: `http://localhost:4000/api/openapi.json`
  - 배포 후 제출: `https://<domain>/api/openapi.json`
- README의 로컬 실행·환경변수·architecture·시연 계정
- 주요 E2E/통합 테스트 결과와 자동 배포 workflow 실행 기록

## 향후 확장

검색·태그 필터를 먼저 추가한 뒤 관련 자료 후보 점수를 도입한다. 이후 pgvector 유사도와 관계 설명을 결합하되 자동 연결 대신 사용자 승인 원칙을 유지한다.
