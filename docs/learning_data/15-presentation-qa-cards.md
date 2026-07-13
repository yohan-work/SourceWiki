# 15. 발표 예상 질문 답변 카드

이 문서는 프로젝트의 사실을 바탕으로 답변을 연습하는 카드다. 각 답변 뒤의 **근거**를 직접 확인해 외우기보다 설명할 수 있게 한다.

## Backend · JWT 인증

### JWT 토큰에는 어떤 정보를 포함했나요?

**30초 답변:** “사용자 ID인 `sub`, access/refresh 구분용 `type`, 세션 추적용 `jti`, 발급자·대상인 issuer/audience, 발급·만료 시각을 넣었습니다. 비밀번호, 이메일, 닉네임 같은 민감하거나 자주 바뀌는 정보는 넣지 않았습니다. access는 15분, refresh는 14일이고 서로 다른 secret으로 서명했습니다.”

**근거:** `apps/api/src/lib/jwt.ts`.

**꼬리 질문 — jti가 왜 필요한가?** refresh token을 DB의 `refresh_sessions`와 연결하고, 회전한 이전 토큰이 재사용됐는지 감지하기 위해서다.

## Database · 테이블 관계

### 테이블 관계를 어떤 기준으로 설계했나요?

**30초 답변:** “도메인에서 누가 데이터를 소유하는지와 한쪽에 몇 개가 연결되는지로 설계했습니다. 사용자는 여러 자료·댓글·세션을 가지므로 1:N, 자료와 태그는 서로 여러 개를 연결하므로 `source_tags`를 둔 N:M입니다. 자료 삭제 시 의미가 함께 사라지는 댓글·파일은 cascade, 사용자와 자료처럼 기록 보존 판단이 필요한 관계는 restrict를 사용했습니다.”

**근거:** `apps/api/prisma/schema.prisma`.

**꼬리 질문 — tag 이름을 Source에 배열로 넣지 않은 이유는?** 태그 중복을 정규화하고, 하나의 태그로 여러 자료를 조회하며, 태그 속성을 확장하기 쉽게 하기 위해서다.

## Frontend · Store 상태관리

### 상태 관리는 어떤 라이브러리를 사용했나요?

**30초 답변:** “TanStack Query를 서버 상태 관리에 사용했습니다. 별도 global store는 두지 않았고, 로그인 사용자·자료 목록처럼 API가 진실인 데이터는 Query cache, 입력값·로딩 버튼·미리보기는 React Hook Form과 useState로 나눴습니다.”

**근거:** `query-provider.tsx`, `use-me-query.ts`, `source-form.tsx`.

### 어떤 데이터를 상태 관리로 관리했나요?

**답변:** “`['auth', 'me']` 로그인 사용자, 자료 목록/상세/파일 응답은 Query cache에 두었습니다. 폼 텍스트, 선택 파일, 추출 미리보기, 로그아웃 진행 상태는 화면 지역 상태입니다.”

### 이 라이브러리를 선택한 이유는 무엇인가요?

**답변:** “공유할 데이터 대부분이 서버 데이터였기 때문입니다. fetch, cache, loading/error, mutation 뒤 cache invalidation을 한 도구로 처리해 Store에 API 응답을 중복 저장하지 않았습니다.”

## Frontend · API 연동과 에러

### API 요청은 어떤 방식으로 호출했고 어디에서 관리했나요?

**답변:** “브라우저 fetch를 공통 `apiFetch`로 감쌌고, auth/source/user처럼 feature별 API 모듈이 endpoint를 관리합니다. 컴포넌트는 URL 대신 업무 함수만 호출합니다.”

**근거:** `apps/web/src/lib/api/api-client.ts`, `features/*/*-api.ts`.

### 인증 토큰은 어떻게 전달하나요?

**답변:** “서버가 httpOnly 쿠키로 설정하고 `credentials: include` 요청에서 브라우저가 자동 전달합니다. localStorage에는 저장하지 않습니다.”

### 프론트엔드 API 에러는 어떻게 처리하나요?

**답변:** “공통 래퍼가 백엔드 오류 JSON을 `ApiError`로 바꿉니다. 폼은 fieldErrors를 입력칸에, 일반 message를 root 오류에 표시하고, 네트워크 오류는 별도 안내를 보여 줍니다.”

## Frontend · 로그인과 회원가입

### 로그인 상태는 어디에 저장되고 새로고침 뒤 어떻게 유지되나요?

**답변:** “토큰은 httpOnly 쿠키, 사용자 표시 정보는 TanStack Query cache에 있습니다. 새로고침으로 메모리 캐시는 사라져도 쿠키는 남고 `/api/auth/me`를 다시 요청해 상태를 복구합니다.”

### 인증이 필요한 페이지 접근은 어떻게 제어하나요?

**답변:** “프로필·자료 작성 폼은 `useMeQuery` 결과가 없으면 로그인 페이지로 보내 UX를 제어합니다. 다만 실제 보안은 API middleware가 access token·이메일 인증·작성자 권한을 검사해서 보장합니다.”

### 메일 인증은 어떤 방식인가요?

**답변:** “가입 시 비밀번호 hash와 미인증 계정을 저장하고, 랜덤 토큰의 hash와 만료 시각을 DB에 저장합니다. SMTP로 원본 토큰이 든 링크를 보내고, 링크를 열면 API가 hash·만료·사용 여부를 검사한 뒤 `emailVerifiedAt`을 기록합니다. 개발은 Mailpit, 운영은 실제 Gmail SMTP를 사용합니다.”

## Docker·Cloud 꼬리 질문

### Docker Compose를 왜 사용했나요?

**답변:** “Web, API, DB, Mailpit, Caddy의 실행 환경과 연결 관계를 선언해 로컬·CI에서 같은 구조를 재현하기 위해서입니다. health check와 volume도 함께 정의했습니다.”

### 배포 흐름을 설명해 주세요.

**답변:** “main의 CI가 성공하면 Deploy workflow가 Web/API 이미지를 GHCR에 Git SHA 태그로 push합니다. Azure VM은 그 이미지를 pull하고, migration을 Azure PostgreSQL에 적용한 다음 Compose로 Web·API·Caddy를 실행합니다. Caddy가 HTTPS와 `/api` 라우팅을 맡습니다.”

## 최종 점검

각 답변을 말한 뒤 반드시 다음을 스스로 확인한다.

1. “왜?”라는 꼬리 질문에 설계 이유를 말할 수 있는가?
2. 근거가 되는 파일 하나를 말할 수 있는가?
3. 현재 구현의 한계와 개선 가능성을 과장 없이 말할 수 있는가?
