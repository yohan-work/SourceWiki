# SourceLink Wiki Phase 4 작업 인계서

> - 마지막 갱신: 2026-06-23 (Asia/Seoul)
> - Phase 상태: URL 추출 preview 구현 완료, AI 요약은 Phase 5 이후

## 완료 범위

- `POST /api/tools/extract-url` API 추가
- URL preview request/response shared Zod schema와 TypeScript type 추가
- Swagger/OpenAPI `/tools/extract-url` 문서 등록
- SSRF 방어 포함 URL extractor adapter 구현
- DNS resolve 결과 public IP 검증, redirect 단계별 재검증, 최대 3회 redirect 제한
- Node `https.request` custom lookup contract 대응: `all: true` callback과 단일 address callback 모두 지원
- DNS 결과가 여러 개일 때 연결 실패 주소를 건너뛰고 다음 public address 재시도
- HTTP(S)만 허용, credential/fragment/비표준 port 거부
- 추출 preview URL의 fragment는 허용하되 extractor에서 제거
- 10초 timeout, 2MB body 제한, HTML/plain text Content-Type 제한
- HTTPS SNI `servername` 명시와 browser-like request headers 적용
- HTML 본문 정제: `@mozilla/readability` + `jsdom`
- 정제 본문 200자 미만 실패 처리, 최대 100,000자 truncation 반환
- 규칙 기반 `suggestedTags` 생성: domain, 알려진 AI 키워드, 제목·본문 빈도 기반 최대 10개
- 태그 추천 품질 필터: 조사·서술어 결합 한국어 토큰, 코드 filler 토큰, sourceType 자체 태그 제외
- `/sources/new` 등록 화면에 `본문 가져오기` 버튼과 preview UI 추가
- 추출 성공 시 `title`, `originalUrl`, `sourceType`, `rawText`, 빈 태그 입력칸 자동 채움
- 추출 실패 시 기존 입력 유지와 수동 저장 fallback 유지
- 상세 화면에서 공유 태그 기반 관련 자료 최대 5개 표시
- extractor unit test와 OpenAPI path test 추가

## 실행

```bash
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm db:deploy
pnpm db:seed
pnpm dev
```

주요 URL:

```text
Web: http://localhost:3000
Sources: http://localhost:3000/sources
New Source: http://localhost:3000/sources/new
Swagger: http://localhost:4000/api/docs
OpenAPI: http://localhost:4000/api/openapi.json
Mailpit: http://localhost:8025
```

Seed 계정:

```text
archive.owner@example.test / sourcewiki-demo-password
curious.reader@example.test / sourcewiki-demo-password
```

## 검증 상태

- 성공: `pnpm lint`
- 성공: `pnpm typecheck`
- 성공: `pnpm test` with PostgreSQL
- 성공: `pnpm build`
- 성공: `pnpm format:check`
- 성공: `docker compose config --quiet`
- 성공: `git diff --check`
- 성공: `pnpm --filter @sourcewiki/api exec vitest run src/modules/tools/url-extractor.test.ts src/openapi/document.test.ts`
- 성공: `pnpm --filter @sourcewiki/api exec vitest run src/modules/tools/tag-suggester.test.ts src/modules/tools/url-extractor.test.ts`
- 성공: `pnpm test`에서 source related 자료 통합 테스트 포함 19개 API 테스트 통과
- 성공: 실제 공개 URL 직접 extractor smoke
  - `https://www.aitimes.com/news/articleView.html?idxno=211959`
  - title 추출 성공, raw text 751자 반환 확인
- 제한: 브라우저에서 실제 UI 버튼 smoke와 `pnpm test:e2e`는 이번 작업 중 별도로 완료하지 않았다.

커밋 전 권장 재검증:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config --quiet
git diff --check
pnpm test:e2e
```

수동 smoke 권장:

```text
1. seed 계정으로 로그인
2. /sources/new 이동
3. 공개 HTML URL 입력 후 본문 가져오기
4. 제목·본문 자동 채움과 preview 확인
5. 태그 입력칸이 비어 있으면 추천 태그 자동 채움 확인
6. 저장 후 상세 이동 확인
7. 같은 태그를 공유하는 다른 자료가 있으면 관련 자료 표시 확인
8. localhost/private IP/unsupported content type URL 실패 시 입력 유지 확인
```

실제 성공 확인 URL:

```text
https://www.aitimes.com/news/articleView.html?idxno=211959
```

## 주요 변경 파일

```text
apps/api/package.json
apps/api/src/app.ts
apps/api/src/modules/tools/
apps/api/src/modules/tools/tag-suggester.ts
apps/api/src/openapi/document.ts
apps/api/src/openapi/document.test.ts
apps/web/src/app/globals.css
apps/web/src/features/sources/source-api.ts
apps/web/src/features/sources/source-form.tsx
apps/web/src/features/sources/source-detail-view.tsx
packages/shared/src/index.ts
pnpm-lock.yaml
```

## 추가 의존성

```text
@mozilla/readability
jsdom
ipaddr.js
@types/jsdom
```

## 확인된 주의점

- extractor 테스트는 네트워크 안정성을 위해 DNS/HTTP를 mock한다. 실제 공개 사이트는 robots, paywall, JS 렌더링, anti-bot, encoding 상태에 따라 실패할 수 있다.
- JS 렌더링, 인증 필요, CAPTCHA, paywall 문서는 MVP에서 지원하지 않는다.
- URL 추출 endpoint는 저장 전 preview 전용이다. 저장은 기존 `POST /sources`가 담당하며 URL 변경 시 자동 재추출하지 않는다.
- `sourceType` 추정은 hostname/path 기반 휴리스틱이다. 사용자가 등록 화면에서 직접 수정할 수 있다.
- `suggestedTags`는 AI가 아니라 규칙 기반 휴리스틱이다. 사용자가 저장 전 태그 입력칸에서 수정할 수 있으며, 이미 태그를 입력한 경우 자동 추천이 덮어쓰지 않는다.
- 자동 태그는 보수적으로 필터링한다. 예: `값을`, `있습니다`, `Set`, `const`, `article`, `docs` 같은 약한 토큰은 태그로 쓰지 않는다.
- 관련 자료는 별도 `source_links` 테이블에 저장하지 않는다. 상세 조회 시 같은 태그를 공유하는 자료를 동적으로 계산해 보여준다.
- HTML charset은 현재 UTF-8 decoding 기준이다. 일부 legacy encoding 문서는 본문 품질이 낮을 수 있다.
- OpenAPI 문서 생성은 Zod transform/pipe를 JSON Schema로 표현하지 못한다. `ExtractUrlRequest`는 runtime Zod schema 대신 수동 JSON Schema로 문서화한다.
- Node `https.request`는 내부에서 custom lookup을 `all: true` 옵션으로 호출할 수 있다. fixed IP 연결을 유지하려면 callback이 `[{ address, family }]` 형태도 지원해야 한다.
- AI타임스 422 원인은 사이트 규제가 아니라 custom lookup callback contract 불일치였다. GET 요청 자체는 200 HTML을 반환하며 수정 후 extractor 직접 호출은 성공했다.
- `pnpm test`는 sandbox 안에서 supertest listen 제한으로 실패할 수 있어, 이번에는 승인된 일반 실행으로 통과를 확인했다.
- Swagger UI `/api/docs`는 Phase 3에서 언급된 helmet CSP 주의점이 여전히 남아 있다. OpenAPI JSON과 document validation은 통과했다.
- E2E runner 안정성 이슈는 Phase 3 handoff와 동일하게 CI 또는 일반 터미널에서 계속 최종 확인 대상이다.

## 다음 단계

- Phase 5 AI 요약: Ollama adapter, prompt, schema 검증, repair 1회, timeout
- Phase 5 UI: 상세 화면에서 요약 요청·검토·수정·적용 flow 구현
- Phase 5 실행 모드: `AI_MODE=ollama|disabled|demo`, demo 표시 강제
- Phase 6 배포: EC2, registry, migration deploy, HTTPS smoke
