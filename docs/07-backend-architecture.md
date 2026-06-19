# 백엔드 아키텍처

## 구조

Express, TypeScript, Prisma, Zod를 사용한다. HTTP와 비즈니스 규칙, 외부 서비스를 분리해 이메일·Ollama·URL extractor를 교체할 수 있게 한다.

```text
apps/api/src/
  app.ts, server.ts
  config/              # 검증된 환경변수
  modules/
    auth/              # route/controller/service/repository/schema
    sources/
    comments/
    extraction/
    ai/
  middleware/          # auth, origin, rate-limit, error, request-id
  integrations/        # smtp, ollama, http extractor
  lib/                 # prisma, logger, crypto
  openapi/
```

- route: URL, middleware, OpenAPI 연결
- controller: HTTP 입력/출력 변환만 수행
- service: transaction, 권한, 비즈니스 규칙
- repository: Prisma query 캡슐화
- integration: SMTP·Ollama·외부 HTTP I/O

서비스는 Express request/response에 의존하지 않는다.

## 요청 처리

`requestId → 보안 header → JSON 크기 제한 → Origin 검사 → rate limit → 인증 → Zod 검증 → controller → service → repository` 순서다. 중앙 error middleware가 domain error를 상태·code로 변환하고 알 수 없는 오류는 내부 정보를 숨긴 500으로 응답한다.

`authenticate`는 access cookie 검증 후 최소 사용자 context를 만든다. `requireVerifiedUser`는 DB의 현재 인증 상태를 확인한다. 소유권은 service에서 resource를 조회하거나 `where: {id, userId}` 조건으로 mutation하며 controller의 ID를 신뢰하지 않는다.

## 인증 구현

- bcrypt cost 12, 최대 72-byte 입력 제한
- access 15분, refresh 14일, 서로 다른 signing secret과 issuer/audience 검증
- JWT secret은 최소 32 random bytes이며 환경변수 검증 실패 시 서버를 시작하지 않는다.
- token 비교는 hash와 timing-safe comparison을 사용한다.
- refresh 회전은 DB transaction으로 이전 세션 폐기와 새 세션 생성을 원자화한다.
- 인증 성공 후에만 쿠키를 설정하고 오류 시 부분 쿠키를 남기지 않는다.

이메일 인증 service는 random 32-byte token을 만들고 hash만 저장한 뒤 application URL을 mail adapter에 전달한다. production은 SMTP, development는 console/Mailpit adapter를 dependency injection한다. resend와 login 응답은 계정 열거 위험을 줄이는 메시지를 사용한다.

## 자료·댓글 구현

목록 query는 author·tags·comment count를 한 번에 select하고 `rawText`를 제외한다. Prisma `skip/take`와 같은 filter의 count를 transaction 또는 병렬 query로 실행한다. 정렬은 `createdAt desc, id desc`다.

자료 생성·수정에서 태그 정규화와 연결 변경은 transaction 안에서 처리한다. 댓글 수정·삭제와 자료 수정·삭제는 ID와 작성자 ID를 같은 query 조건에 사용한다. 존재 여부와 권한 오류를 정확히 구분해야 하는 endpoint만 별도 조회한다.

## 외부 연동과 장애 격리

- SMTP: timeout, 제한된 retry, credential 비노출 logging
- URL extractor: 별도 service, redirect 수동 처리, response streaming 중 byte 제한
- Ollama: 명시적 timeout, schema 검증, 환경 feature flag
- 외부 장애는 5xx domain error로 변환하며 DB CRUD transaction에 외부 I/O를 넣지 않는다.

AI 요약은 먼저 source를 읽고 권한·원문을 확인한 뒤 Ollama를 호출한다. 응답은 초안으로만 반환하고 DB 저장은 별도 PATCH에서 수행해 느린 외부 호출과 DB 변경을 분리한다.

## 보안과 관측성

- Helmet 계열 보안 header와 reverse proxy HTTPS를 사용한다.
- JSON body 기본 256KB, raw text 포함 source body는 최대 512KB로 제한한다.
- auth, verification, extraction, AI에 각각 rate limit key와 한도를 둔다.
- structured log에 requestId, route, status, latency, userId(있을 때)만 기록한다.
- 비밀번호, cookie, Authorization, token query, rawText, SMTP credential은 redact한다.
- `/api/health/live`는 process 상태, `/api/health/ready`는 DB 연결을 검사한다. Ollama는 readiness 필수가 아니다.

## Swagger와 타입

공유 Zod schema를 요청 validation과 OpenAPI schema에 사용한다. response DTO는 Prisma model을 그대로 반환하지 않고 mapper로 민감·내부 필드를 제거한다. CI에서 OpenAPI 생성과 route 등록, 예제 schema validation을 검사한다.

## 테스트

- unit: service 권한, token hash/rotation, tag 정규화, 오류 mapping
- integration: 임시 PostgreSQL에서 auth·CRUD·cascade·pagination
- contract: OpenAPI request/response schema와 실제 handler 결과
- adapter: SMTP·Ollama·HTTP는 fake server로 timeout과 malformed response 검증
- migration: 빈 DB와 이전 schema 모두 `migrate deploy` 성공 확인
