# SourceLink Wiki Phase 7 작업 인계서

> - 마지막 갱신: 2026-06-26 (Asia/Seoul)
> - Phase 상태: 자료 단위 AI 어시스턴트 고도화 구현 완료, push 미진행

## 완료 범위

- AI 대화 응답에 원문 근거 문단 `citations` 추가
- shared `sourceChatResponseSchema`에 `citations` 계약 추가
- 추천 질문 response shared schema와 TypeScript type 추가
- `POST /api/sources/:id/ai/suggestions` API 추가
- Swagger/OpenAPI `/sources/{id}/ai/suggestions` 문서 등록
- `AI_MODE=demo`에서 고정 추천 질문 fixture 반환
- `AI_MODE=ollama`에서 원문 기반 추천 질문 3~5개 생성
- `AI_MODE=disabled`에서 503 `AI_DISABLED` 반환
- 추천 질문과 citations 모두 DB에 저장하지 않고 response-only/session-only로 처리
- 작성자 소유권과 `rawText` 존재 여부 검증 추가
- 채팅 citations는 원문 문단을 분리한 뒤 질문·답변 token overlap 기준으로 최대 3개 후보 반환
- citations 후보가 없으면 첫 원문 문단 1개를 fallback으로 반환
- Web API client에 `sourceApi.suggestQuestions(id)` 추가
- Next route handler `/api/sources/[id]/ai/suggestions` 추가
- AI 어시스턴트 `대화` 탭 첫 화면에 추천 질문 UI 추가
- 추천 질문 클릭 시 해당 질문으로 즉시 AI 대화 요청
- AI 답변 아래 `원문에서 확인한 내용` 근거 문단 표시
- demo 채팅 응답에 `데모 응답` 표시
- AI 요약 영역에 `읽기 가이드` 섹션 추가
  - 빠른 이해
  - 실무 적용
  - 용어/개념
- 추천 질문, citations, 읽기 가이드 UI 스타일 추가
- 추천 질문 API, chat citations, OpenAPI, shared schema 테스트 보강

## 커밋

이번 Phase 7 작업은 기능별로 분리해 로컬 커밋했다. push는 하지 않았다.

```text
2f1ead2 feat(api): add source AI suggestions and citations
6da8c96 feat(web): surface AI question suggestions
```

커밋 분리 기준:

- `2f1ead2`: shared schema/type, API service/router, AI 생성 로직, OpenAPI, API/shared 테스트
- `6da8c96`: Next proxy route, Web API client, 상세 AI 패널 UI, CSS

## 추가된 주요 파일

```text
apps/web/src/app/api/sources/[id]/ai/suggestions/route.ts
process-docs/phase-07-handoff.md
```

갱신 파일:

```text
apps/api/src/modules/sources/source-summarizer.ts
apps/api/src/modules/sources/source-summarizer.test.ts
apps/api/src/modules/sources/source.service.ts
apps/api/src/modules/sources/source.routes.ts
apps/api/src/modules/sources/source.integration.test.ts
apps/api/src/openapi/document.ts
apps/api/src/openapi/document.test.ts
apps/web/src/features/sources/source-api.ts
apps/web/src/features/sources/source-detail-view.tsx
apps/web/src/app/globals.css
packages/shared/src/index.ts
packages/shared/src/index.test.ts
```

## API 변경 요약

### 채팅 응답 확장

`POST /api/sources/:id/chat` 응답의 `data`에 `citations`가 추가됐다.

```json
{
  "data": {
    "answer": "원문 기반 답변",
    "citations": [
      {
        "index": 1,
        "text": "근거 문단"
      }
    ],
    "mode": "ollama"
  },
  "meta": {
    "requestId": "..."
  }
}
```

### 추천 질문 API

```text
POST /api/sources/:id/ai/suggestions
```

요구 조건:

- 인증 필요
- 이메일 인증 필요
- 자료 작성자만 사용 가능
- `rawText`가 있어야 함

응답:

```json
{
  "data": {
    "questions": ["이 글의 핵심 주장은 무엇인가요?", "실무에 적용할 만한 점은 무엇인가요?"],
    "mode": "demo"
  },
  "meta": {
    "requestId": "..."
  }
}
```

주요 오류:

```text
403 FORBIDDEN
409 SOURCE_TEXT_REQUIRED
502 AI_INVALID_RESPONSE
503 AI_DISABLED 또는 AI_UNAVAILABLE
504 AI_TIMEOUT
```

## Web 동작 요약

AI 어시스턴트 패널의 `대화` 탭에서 아직 대화가 없을 때 추천 질문이 표시된다.

1. 작성자가 rawText가 있는 자료 상세로 진입
2. `AI 어시스턴트` 클릭
3. `대화` 탭 클릭
4. 추천 질문 API 호출
5. 추천 질문 버튼 표시
6. 질문 클릭 시 채팅 요청 전송
7. AI 답변과 근거 문단 표시

추천 질문 로딩 실패 시에는 직접 질문 입력 안내만 보여주고, 채팅 기능 자체는 유지된다.

## 검증 상태

성공:

```text
pnpm --filter @sourcewiki/shared build
pnpm --filter @sourcewiki/shared test
pnpm --filter @sourcewiki/api typecheck
pnpm --filter @sourcewiki/api lint
pnpm --filter @sourcewiki/api test
pnpm --filter @sourcewiki/web typecheck
pnpm --filter @sourcewiki/web lint
pnpm --filter @sourcewiki/web build
pnpm format:check
```

메모:

- `pnpm --filter @sourcewiki/api test`는 sandbox에서 `listen EPERM: operation not permitted 0.0.0.0`로 실패하므로 승인된 일반 실행으로 통과 확인했다.
- `pnpm --filter @sourcewiki/web build` 실행 중 Next가 `apps/web/next-env.d.ts`를 production route type 경로로 자동 변경했으나, 기능 변경과 무관해 원래 dev route type 경로로 되돌렸다.

## 확인된 주의점

- 추천 질문과 채팅 기록은 저장하지 않는다. 브라우저 세션 상태에만 존재한다.
- citations는 모델이 직접 인용 위치를 반환하는 방식이 아니다. API가 원문 문단을 분리하고 질문·답변과의 token overlap으로 후보 문단을 계산한다.
- citations는 “정확한 문장 위치 보증”이 아니라 답변 확인을 돕는 근거 후보다.
- 긴 문서 chunking, 문단 ID 저장, vector search, pgvector는 아직 구현하지 않았다.
- `AI_MODE=demo`의 추천 질문과 답변은 실제 원문 분석 결과가 아니다. UI에서 demo 표시를 유지한다.
- `AI_MODE=ollama`에서는 추천 질문 API도 기존 Ollama `/api/generate` 경로와 동일한 timeout 정책을 사용한다.
- rawText가 없는 자료에서는 추천 질문과 채팅 모두 409 `SOURCE_TEXT_REQUIRED` 대상이다.
- 운영 배포는 아직 진행하지 않았다. Phase 6 상태와 동일하게 실제 AWS/EC2/DNS 배포는 대기 상태다.
- push는 하지 않았다.

## 수동 Smoke 권장

```text
1. AI_MODE=demo로 API/Web 실행
2. seed 계정으로 로그인
3. rawText가 있는 자료 상세 진입
4. AI 어시스턴트 열기
5. 대화 탭 진입
6. 추천 질문 3개 이상 표시 확인
7. 추천 질문 클릭
8. 사용자 질문과 AI 답변 표시 확인
9. 답변 아래 원문 근거 문단 표시 확인
10. demo 응답 표시 확인
11. 직접 질문 입력 후 Enter 전송 확인
12. Shift+Enter 줄바꿈과 한국어 IME 조합 중 조기 전송 없음 확인
13. rawText 없는 자료에서 AI 버튼 비활성 또는 본문 필요 안내 확인
14. AI_MODE=disabled에서 추천 질문/대화 오류가 기존 자료 내용을 덮어쓰지 않는지 확인
15. AI_MODE=ollama와 `OLLAMA_BASE_URL=http://127.0.0.1:11434`로 실제 추천 질문 smoke
```

## 다음 단계

- 브라우저에서 Phase 7 수동 smoke 수행
- 실제 Ollama 모델로 추천 질문 품질 확인
- citations 정확도를 높이려면 문단 chunk metadata와 모델 응답의 citation id를 함께 설계
- 아카이브 전체 검색·추천으로 확장하려면 embedding/pgvector 설계 후 별도 Phase로 분리
- 실제 배포 전 Phase 6의 EC2/DNS/GitHub Secrets 준비와 HTTPS smoke 진행
