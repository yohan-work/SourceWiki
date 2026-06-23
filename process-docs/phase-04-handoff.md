# SourceLink Wiki Phase 4 작업 인계서

> - 마지막 갱신: 2026-06-23 (Asia/Seoul)
> - Phase 상태: URL 추출 preview 구현 완료, AI 요약은 Phase 5 이후

## 완료 범위

- `POST /api/tools/extract-url` API 추가
- URL preview request/response shared Zod schema와 TypeScript type 추가
- Swagger/OpenAPI `/tools/extract-url` 문서 등록
- SSRF 방어 포함 URL extractor adapter 구현
- DNS resolve 결과 public IP 검증, redirect 단계별 재검증, 최대 3회 redirect 제한
- HTTP(S)만 허용, credential/fragment/비표준 port 거부
- 10초 timeout, 2MB body 제한, HTML/plain text Content-Type 제한
- HTML 본문 정제: `@mozilla/readability` + `jsdom`
- 정제 본문 200자 미만 실패 처리, 최대 100,000자 truncation 반환
- `/sources/new` 등록 화면에 `본문 가져오기` 버튼과 preview UI 추가
- 추출 성공 시 `title`, `originalUrl`, `sourceType`, `rawText` 자동 채움
- 추출 실패 시 기존 입력 유지와 수동 저장 fallback 유지
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
- 제한: 브라우저에서 실제 공개 URL 추출 UI smoke와 `pnpm test:e2e`는 이번 작업 중 별도로 완료하지 않았다.

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
5. 저장 후 상세 이동 확인
6. localhost/private IP/unsupported content type URL 실패 시 입력 유지 확인
```

## 주요 변경 파일

```text
apps/api/package.json
apps/api/src/app.ts
apps/api/src/modules/tools/
apps/api/src/openapi/document.ts
apps/api/src/openapi/document.test.ts
apps/web/src/app/globals.css
apps/web/src/features/sources/source-api.ts
apps/web/src/features/sources/source-form.tsx
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
- HTML charset은 현재 UTF-8 decoding 기준이다. 일부 legacy encoding 문서는 본문 품질이 낮을 수 있다.
- `pnpm test`는 sandbox 안에서 supertest listen 제한으로 실패할 수 있어, 이번에는 승인된 일반 실행으로 통과를 확인했다.
- Swagger UI `/api/docs`는 Phase 3에서 언급된 helmet CSP 주의점이 여전히 남아 있다. OpenAPI JSON과 document validation은 통과했다.
- E2E runner 안정성 이슈는 Phase 3 handoff와 동일하게 CI 또는 일반 터미널에서 계속 최종 확인 대상이다.

## 다음 단계

- Phase 5 AI 요약: Ollama adapter, prompt, schema 검증, repair 1회, timeout
- Phase 5 UI: 상세 화면에서 요약 요청·검토·수정·적용 flow 구현
- Phase 5 실행 모드: `AI_MODE=ollama|disabled|demo`, demo 표시 강제
- Phase 6 배포: EC2, registry, migration deploy, HTTPS smoke
