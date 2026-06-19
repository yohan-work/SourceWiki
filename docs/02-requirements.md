# 요구사항 및 완료 기준

## 우선순위

### Core MVP — 제출 필수

- 회원가입, 이메일 중복 확인, 실제 이메일 인증과 재발송
- 로그인, 로그아웃, JWT access/refresh 갱신, 로그인 사용자 조회
- 공개 자료 목록·상세, 인증 사용자 작성, 작성자 수정·삭제
- 공개 댓글 조회, 인증 사용자 작성, 작성자 수정·삭제
- `page`, `limit` 기반 서버 페이징
- 공통 API 오류 처리와 필드 validation 표시
- PostgreSQL 관계 설계, Swagger/OpenAPI, Docker Compose
- AWS EC2 배포와 GitHub Actions 자동 배포

### Differentiation MVP — 제출 포함

- URL 기반 자료 등록과 제목·도메인·정제 본문 추출
- 추출 실패 시 URL만 저장하거나 사용자가 원문 직접 입력
- 로컬 Ollama 요약, 핵심 포인트, 키워드, 추천 태그 초안
- 요약 결과 사용자 수정, AI 비활성·장애 fallback

### Advanced — 제출 이후

- 검색·필터, 좋아요, 프로필 편집, 파일·PDF·YouTube 처리
- 관련 자료 후보, 사용자 확정 연결, embedding과 pgvector
- 지식 그래프, 프로젝트 컬렉션, 브라우저 확장, 주간 digest

## 기능 규칙과 Acceptance Criteria

### 회원가입과 이메일 인증

- 이메일은 앞뒤 공백 제거와 소문자 정규화 후 고유하게 저장한다.
- 사용자는 이메일 중복 여부를 폼에서 확인할 수 있고, 서버는 가입 시에도 고유 제약으로 재검증한다.
- 비밀번호는 8~72자이며 bcrypt cost 12로 해시한다. 평문은 로그·DB·응답에 남기지 않는다.
- 가입 성공 시 30분 유효한 일회용 인증 링크를 발송한다. 토큰 원문은 이메일에만 있고 DB에는 SHA-256 해시만 저장한다.
- 재발송은 기존 미사용 토큰을 폐기하고 rate limit을 적용한다.
- 이미 사용·만료·변조된 링크는 구분된 오류와 재발송 동작을 제공한다.
- 인증 전 사용자는 로그인할 수 없으며 자료·댓글 작성도 불가능하다.

### 로그인과 세션

- 인증 완료 사용자가 올바른 이메일·비밀번호로 로그인하면 access와 refresh JWT가 HttpOnly 쿠키로 설정된다.
- access token은 15분, refresh token은 14일 유효하다. JWT claim은 `sub`, `type`, `jti`, `iat`, `exp`만 포함한다.
- 새로고침 시 `/api/auth/me`로 사용자를 복구한다. 프론트는 JWT 원문을 저장하거나 해석하지 않는다.
- access 만료로 401이 발생하면 한 번만 refresh를 수행하고 원 요청을 재시도한다. refresh 실패 시 세션을 지우고 로그인 화면으로 이동한다.
- refresh는 매번 회전하며 이전 토큰 재사용 감지 시 해당 사용자 세션 family를 폐기한다.
- 로그아웃은 현재 refresh session을 폐기하고 두 쿠키를 만료시킨다.

### 자료

- 비회원 포함 모든 사용자가 최신순 목록과 상세를 조회한다.
- 목록은 `page >= 1`, `1 <= limit <= 50`이며 기본값은 1과 12다. `createdAt DESC, id DESC`로 안정적으로 정렬한다.
- 인증·이메일 인증 완료 사용자는 URL, 제목을 필수로 자료를 저장한다. URL은 유효한 공개 HTTP(S) 주소여야 한다.
- 작성자는 제목, 추출문, 요약, 핵심 포인트, 키워드, 태그, 메모를 수정할 수 있다.
- 작성자만 자료를 수정·삭제하며 타인은 403, 없는 자료는 404를 받는다.
- 자료 삭제 시 댓글과 태그 연결은 transaction 안에서 cascade 삭제한다.
- UI는 중복 제출을 막고 성공 후 관련 query를 무효화한다.

### 댓글

- 댓글 조회는 공개, 작성은 인증·이메일 인증 완료 사용자에게 허용한다.
- 내용은 공백 제외 1~2,000자다.
- 작성자만 댓글을 수정·삭제할 수 있다. 과제 기능 목록에는 수정이 빠져 있지만 권한 요구문을 우선해 수정까지 필수 구현한다.
- 수정된 댓글에는 `updatedAt`을 기준으로 수정됨을 표시한다.

### URL 추출

- 추출 전에 URL과 DNS 결과를 검증하고 public HTTP(S) 목적지만 허용한다.
- 각 redirect마다 다시 검증하고 최대 3회, 연결·응답 합계 10초, 응답 2MB로 제한한다.
- HTML과 일반 텍스트만 처리하며 스크립트·스타일을 제거한 정제 텍스트를 최대 100,000자로 자른다.
- 로그인·JavaScript 렌더링·paywall 페이지는 지원하지 않는 한계를 UI에 안내한다.
- 실패해도 입력 폼을 유지하고 URL만 저장하거나 원문을 붙여넣을 수 있다.

### AI 요약

- 저장된 원문이 있을 때만 작성자가 요약을 요청할 수 있다.
- 실제 단계는 요청 중·완료·실패로 표시하며 근거 없는 진행률을 보여주지 않는다.
- Ollama 응답은 정해진 JSON schema로 검증한다. 파싱 실패 시 한 번 복구를 시도한 뒤 실패 처리한다.
- AI가 꺼져 있거나 timeout이면 자료와 기존 편집 내용은 유지되고 수동 요약 입력이 가능하다.
- 배포 환경의 Mock은 화면에 `데모 요약`임을 표시하며 실제 AI로 오인하게 하지 않는다.

### 운영과 문서

- `/api/docs`에서 실제 API와 일치하는 Swagger 문서를 조회한다.
- Docker Compose로 reverse proxy, web, api, db를 실행하며 DB는 외부에 노출하지 않는다.
- GitHub Actions는 테스트·빌드 성공 후에만 EC2를 갱신하고 migration 후 health check를 통과해야 성공한다.

## 비기능 요구사항

- 모든 mutation은 Zod로 입력 검증하고 인증과 소유권을 서버에서 재검증한다.
- 쿠키 사용 mutation은 SameSite 정책과 `Origin` 검증으로 CSRF를 방어한다.
- 인증·메일·URL 추출·AI API에 목적별 rate limit을 적용한다.
- 비밀번호·JWT·인증 토큰·SMTP credential·원문 전문을 로그에 남기지 않는다.
- 접근성: 키보드 조작, 연결된 label, 오류 focus 이동, 4.5:1 명암비를 지킨다.
- 모바일 360px부터 데스크톱까지 주요 작업을 수행할 수 있다.

## 요구사항 추적표

| 과제 항목 | 화면 | API/구성 | 검증 |
| --- | --- | --- | --- |
| JWT 로그인 | 로그인 | auth login/refresh/me | 만료·회전 E2E |
| 이메일 인증 | 가입·인증 결과 | verify/resend | 만료·재사용 통합 테스트 |
| 게시글 CRUD | 자료 목록·등록·상세·수정 | sources REST | 소유권 통합/E2E |
| 댓글 CRUD | 자료 상세 | comments REST | 소유권 통합/E2E |
| 페이징 | 자료 목록 | `page`, `limit` | 경계·정렬 테스트 |
| DB 관계 | 해당 없음 | Prisma/PostgreSQL | migration·cascade 테스트 |
| Swagger | API 문서 | `/api/docs` | OpenAPI validation |
| Docker/Cloud | 해당 없음 | Compose/EC2 | 배포 smoke test |
| GitHub Actions | 해당 없음 | CI/CD workflow | health check gate |
