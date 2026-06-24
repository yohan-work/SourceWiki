# SourceLink Wiki Phase 5 작업 인계서

> - 마지막 갱신: 2026-06-24 (Asia/Seoul)
> - Phase 상태: 로컬 AI 요약 초안 생성·검토·적용 flow 구현 완료

## 완료 범위

- `POST /api/sources/:id/summarize` API 추가
- AI 요약 response shared Zod schema와 TypeScript type 추가
- Swagger/OpenAPI `/sources/{id}/summarize` 문서 등록
- `AI_MODE=ollama|disabled|demo` 실행 모드 추가
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `AI_TIMEOUT_MS` 환경 변수 추가
- 기본 Ollama 모델을 `gemma4:e4b`로 설정
- 로컬 모델 cold start를 고려해 AI timeout 180초, Web 요청 timeout 190초로 설정
- disabled 모드에서 503 `AI_DISABLED` 반환
- demo 모드에서 고정 fixture와 `mode: "demo"` 반환
- Ollama `/api/generate` adapter 구현
- prompt에 원문 한정, JSON only, 원문 내 지시문 무시 규칙 포함
- 저장된 `rawText` 최대 60,000자만 AI 입력으로 사용
- markdown JSON fence 제거 후 schema 검증
- schema 실패 시 repair 요청 1회 수행
- timeout, 연결 실패, invalid response 오류 code 분리
- 작성자 소유권과 rawText 존재 여부 검증 추가
- summarize API는 DB를 직접 변경하지 않고 review buffer만 반환
- `PATCH /sources/:id`에서 `summaryStatus` 적용 지원
- 상세 화면 작성자 전용 AI 요약 요청·검토·수정·적용 UI 추가
- demo 결과 badge 표시
- 적용 시 summary, keyPoints, keywords, tags, summaryStatus 저장
- 취소·실패 시 기존 요약 보존
- 상세 SSR에서 request cookie를 API로 전달해 `isOwner`와 댓글 권한 hydration mismatch 수정
- 상세 page에서 `/api/auth/me`를 함께 hydrate하고 댓글 작성 가능 여부를 서버 snapshot으로 전달
- 댓글 수정·삭제는 `comment.isOwner`, 자료 수정·삭제와 AI 요약 패널은 `source.isOwner` 기준으로 렌더링

## 실행

기본 실행은 기존과 동일하다.

```bash
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm db:deploy
pnpm db:seed
pnpm dev
```

AI 요약 모드:

```env
AI_MODE=disabled
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:e4b
AI_TIMEOUT_MS=180000
```

로컬 Ollama 사용 시:

```bash
ollama serve
ollama pull gemma4:e4b
AI_MODE=ollama OLLAMA_BASE_URL=http://127.0.0.1:11434 pnpm --filter @sourcewiki/api dev
```

시연 fixture 사용 시:

```bash
AI_MODE=demo pnpm --filter @sourcewiki/api dev
```

## 검증 상태

- 성공: `pnpm --filter @sourcewiki/shared build`
- 성공: `pnpm --filter @sourcewiki/api exec vitest run src/modules/sources/source-summarizer.test.ts src/openapi/document.test.ts`
- 성공: `pnpm --filter @sourcewiki/api typecheck`
- 성공: `pnpm --filter @sourcewiki/web typecheck`
- 성공: `pnpm --filter @sourcewiki/web lint`
- 성공: `pnpm lint`
- 성공: `pnpm db:deploy`
- 성공: `pnpm --filter @sourcewiki/api exec vitest run src/modules/sources/source.integration.test.ts`
- 성공: `pnpm test`
- 성공: `pnpm build`
- 성공: `pnpm format:check`
- 성공: `docker compose config --quiet`
- 성공: `git diff --check`

제한:

- `pnpm test:e2e`는 이번 작업 중 별도로 실행하지 않았다.
- 실제 Ollama 모델 호출 smoke는 로컬 모델 준비 상태에 의존하므로 별도로 완료하지 않았다.
- DB 통합 테스트와 Compose 검증은 sandbox의 Docker/localhost 제한 때문에 승인된 일반 실행으로 확인했다.
- 로컬 포트 접근이 sandbox에서 제한되어 API/Ollama 직접 curl smoke는 사용자 터미널 확인 대상으로 남겼다.

## 주요 변경 파일

```text
.env.example
apps/api/src/config/env.ts
apps/api/src/modules/sources/source-summarizer.ts
apps/api/src/modules/sources/source.service.ts
apps/api/src/modules/sources/source.routes.ts
apps/api/src/openapi/document.ts
apps/web/src/app/sources/[id]/page.tsx
apps/web/src/features/sources/source-api.ts
apps/web/src/features/sources/source-detail-view.tsx
apps/web/src/features/comments/comments-panel.tsx
apps/web/src/lib/api/server-api.ts
apps/web/src/app/globals.css
packages/shared/src/index.ts
docs/05-api-design.md
docs/08-ai-processing-design.md
```

## 확인된 주의점

- `AI_MODE` 기본값은 `disabled`다. 로컬 모델을 쓰려면 API 프로세스 환경에서 명시적으로 `ollama`를 설정해야 한다.
- Ollama는 API readiness 조건이 아니다. Ollama 중단은 summarize API 실패로만 나타나며 자료 CRUD에는 영향이 없어야 한다.
- demo 모드는 실제 원문을 분석한 결과가 아니다. 응답과 UI 모두 demo 표시를 유지한다.
- summarize API는 DB를 직접 수정하지 않는다. 사용자가 상세 화면에서 검토 후 적용해야 저장된다.
- 적용은 기존 `PATCH /sources/:id`를 사용한다. `summaryStatus`는 `not_requested`, `succeeded`, `demo`만 입력 가능하다.
- `rawText`가 없는 자료는 409 `SOURCE_TEXT_REQUIRED`를 반환한다.
- prompt와 rawText 전문은 별도로 로그에 남기지 않는다.
- 긴 문서 chunking과 job queue는 아직 구현하지 않았다. MVP는 단일 요청, 180초 API timeout 기준이다.
- Mac 로컬 Ollama는 `localhost` 대신 `http://127.0.0.1:11434`를 명시하면 연결 이슈를 줄일 수 있다.
- `socket hang up`이 보이면 Web proxy가 API 연결을 잃은 것이다. 모델 cold start 시간을 줄이려면 `ollama run gemma4:e4b "..."`로 warm-up 후 재시도한다.

## 수동 smoke 권장

```text
1. API를 AI_MODE=demo로 실행
2. seed 계정으로 로그인
3. rawText가 있는 자료 상세 진입
4. AI 요약 요청 클릭
5. demo badge와 초안 입력 영역 확인
6. summary/keyPoints/tags를 수정 후 적용
7. 상세 요약, 핵심 포인트, 태그, demo badge 갱신 확인
8. rawText가 없는 자료에서 버튼 비활성/안내 확인
9. AI_MODE=disabled에서 오류 표시와 기존 요약 보존 확인
10. `AI_MODE=ollama OLLAMA_BASE_URL=http://127.0.0.1:11434`에서 실제 모델 응답 smoke
11. 상세 새로고침 시 수정/삭제/댓글 폼 hydration warning이 없는지 확인
```

## 다음 단계

- Phase 5 마무리 smoke: 브라우저 UI flow와 `pnpm test:e2e`
- 실제 Ollama 모델 smoke 및 모델별 prompt 품질 조정
- Phase 6 배포: EC2, registry, migration deploy, HTTPS smoke
