  # SourceLink Wiki 기획·설계 문서 보강 계획

  ## 요약

  planning/plan-01.md를 기준으로 docs/에 10개 설계 문서를 작성한다. 서비스는 비회원도 자료를 조회할 수 있는 공개 지식 아카이브로 구성하고, 로그인 사용자만 자
  료·댓글을 작성하며 작성자만 수정·삭제할 수 있게 한다.

  제출 범위는 과제 필수 기능과 URL 본문 추출·로컬 Ollama 요약까지다. 관련 자료 추천, 검색, 프로필, pgvector는 후속 범위로 분리한다.

  ## 주요 보완 사항

  - 과제에는 댓글 수정 권한이 명시되어 있으므로 PATCH /api/comments/:id와 댓글 수정 UI를 Core MVP에 추가한다.
  - 인증 API에 이메일 중복 확인, 로그아웃, access token 갱신을 추가한다.
  - JWT는 짧은 access token과 회전형 refresh token을 사용하고 모두 HttpOnly, Secure, SameSite 쿠키로 전달한다.
  - refresh token 세션·폐기를 위한 refresh_sessions 테이블을 추가한다.
  - 이메일 인증 토큰과 refresh token은 원문이 아닌 해시를 DB에 저장한다.
  - 실제 이메일은 SMTP 호환 서비스로 발송하고, 개발 환경만 콘솔 또는 로컬 메일 방식으로 대체한다.
  - TanStack Query는 서버 상태, Zustand는 최소한의 클라이언트 UI 상태만 담당하도록 역할을 분리한다.
  - 사용자 정보는 /api/auth/me로 복구하며 JWT 값 자체는 프론트 상태에 저장하지 않는다.
  - 공개 목록·상세·댓글 조회는 비로그인 허용, 작성·수정·삭제는 인증 및 소유권 검증을 적용한다.
  - URL 추출은 SSRF 방어, DNS 재검증, redirect 제한, timeout, MIME·용량·텍스트 길이 제한을 포함한다.
  - AI 처리 화면은 실제 API 단계만 표시하고, 임의의 가짜 진행률은 사용하지 않는다.
  - 원문 전체 공개에 따른 저작권·개인정보 위험을 줄이기 위해 상세 화면은 기본적으로 추출문 미리보기와 원본 링크를 제공하고, 저장 길이 제한 정책을 명시한다.
  - DB 삭제 정책, 고유 제약, 인덱스, 정렬 안정성을 문서화한다.

  ## 확정 아키텍처와 인터페이스

  - 모노레포: apps/web, apps/api, packages/shared
  - Frontend: Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, Zustand
  - Backend: Node.js, Express, Prisma, Zod, Swagger/OpenAPI
  - Database: PostgreSQL
  - Infra: AWS EC2 단일 VM, Docker Compose, reverse proxy, GitHub Actions
  - 같은 도메인에서 /는 Next.js, /api는 Express로 연결해 쿠키와 CORS 구성을 단순화한다.
  - 배포 서버에서는 AI 기능을 비활성화하거나 명시적인 데모 Mock으로 제공하고, 로컬 개발 환경에서 Ollama를 실제 실행한다.

  필수 API에는 다음을 포함한다.

  - 인증: 회원가입, 이메일 중복 확인, 이메일 인증·재발송, 로그인, 로그아웃, 토큰 갱신, 내 정보
  - 자료: 생성, 공개 목록, 공개 상세, 작성자 수정·삭제, page/limit 페이징
  - 댓글: 공개 조회, 인증 작성, 작성자 수정·삭제
  - URL/AI: 안전한 URL 추출 미리보기, 저장 자료 요약 생성
  - 모든 응답은 공통 성공 구조와 code, message, fieldErrors를 갖는 공통 오류 구조를 사용한다.

  JWT에는 최소한 sub, type, iat, exp, jti만 넣고 이메일·닉네임 같은 변경 가능한 정보는 넣지 않는다. refresh token은 회전 및 재사용 탐지를 적용하며 로그아웃
  시 세션을 폐기한다.

  ## 문서 작성 구성

  - 제품 개요: 공개 아카이브 성격, 사용자, 핵심 가치, 게시판과의 차이
  - 요구사항: Core/Differentiation/Advanced 범위와 기능별 완료 기준
  - 화면 기획: 인증, 목록, 등록, 상세, 댓글 수정, AI 실패 fallback 및 접근 권한
  - DB 설계: users, verification tokens, refresh sessions, sources, comments, tags 관계와 제약
  - API 설계: 요청·응답 타입, 인증, 권한, 페이징, 오류 코드, Swagger 기준
  - 프론트엔드 구조: Server/Client Component 경계, Query 캐시, API client, 인증 복구, 공통 오류 처리
  - 백엔드 구조: controller/service/repository 경계, 검증, transaction, 인증·권한 미들웨어
  - AI 처리: URL 추출, 길이 제한, Ollama JSON 응답 검증, timeout 및 비활성화 fallback
  - 개발 로드맵: 기반 설정 → 인증 → CRUD → URL 추출 → AI 요약 → 배포 순서
  - 발표 문서: 과제 요구사항 매핑, 평가 예상 질문과 실제 설계 근거

  ## 테스트 및 완료 기준

  - 인증 단위·통합 테스트: 중복 이메일, 인증 만료·재사용, 비밀번호 해시, 로그인, refresh 회전, 로그아웃
  - 권한 테스트: 비회원 쓰기 차단, 타인 자료·댓글 수정/삭제 차단, 작성자 작업 허용
  - API 테스트: 페이징 경계, 안정적인 정렬, validation 오류, 존재하지 않는 리소스
  - URL 테스트: 사설 IP, redirect 우회, 잘못된 MIME, 과대 응답, timeout, 추출 실패
  - AI 테스트: 정상 JSON, 잘못된 JSON, Ollama 중단, timeout, 비활성화 환경에서도 CRUD 정상 동작
  - 프론트 E2E: 가입·메일 인증·로그인·새로고침 복구·자료 CRUD·댓글 CRUD·토큰 만료 흐름
  - 배포 검증: Docker 재시작, DB migration, HTTPS 쿠키, Swagger URL, GitHub Actions 자동 배포 smoke test
  - 요구사항 추적표에서 과제의 모든 필수 항목이 최소 한 개의 화면·API·DB·테스트 항목과 연결되어야 한다.

  ## 가정 및 제외 범위

  - 댓글 수정은 과제 본문의 권한 요구를 우선해 필수로 구현한다.
  - 비회원도 공개 자료와 댓글을 조회할 수 있다.
  - 검색, 관련 자료 추천·연결, 프로필, 파일 업로드, pgvector는 제출 이후 범위다.
  - 대시보드는 Core API로 계산 가능한 기본 통계만 제공하며 별도 분석 시스템은 만들지 않는다.
  - 운영 DB는 EC2 내부 Docker 네트워크에만 노출하고 외부 포트를 열지 않는다.