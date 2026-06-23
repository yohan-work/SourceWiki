# 11. Phase 3 자료·댓글 DB 모델

## Phase 3에서 DB가 확장된 이유

Phase 2까지는 사용자를 인증하고 session을 유지하는 것이 핵심이었습니다. Phase 3부터는 사용자가 저장한 기술 자료와 댓글을 계속 조회·수정·삭제해야 하므로 업무 데이터 table이 추가됐습니다.

```text
users
  ├─ sources
  │    ├─ comments
  │    └─ source_tags ─ tags
  └─ comments
```

새로 추가된 주요 table은 다음 네 개입니다.

```text
sources
comments
tags
source_tags
```

## sources table

`sources`는 사용자가 저장한 자료의 기준 데이터입니다.

| 필드 | 의미 |
| --- | --- |
| `user_id` | 자료 작성자 |
| `title` | 자료 제목 |
| `original_url` | 원문 URL |
| `source_domain` | URL에서 추출한 domain |
| `source_type` | article, docs, paper, github, other |
| `raw_text`, `raw_text_preview` | 정제 본문과 목록용 preview |
| `summary`, `key_points`, `keywords` | 요약과 분류 정보 |
| `personal_note` | 작성자 개인 메모 |
| `extraction_status`, `summary_status` | URL 추출·AI 요약 단계의 상태 |

`raw_text`, `summary`, `key_points`, `keywords` 일부는 Phase 4 이후 자동 추출·요약 기능과 연결될 자리입니다. Phase 3에서는 직접 입력하거나 기본값을 사용합니다.

## comments table

`comments`는 특정 자료에 달린 댓글입니다.

| 필드 | 의미 |
| --- | --- |
| `source_id` | 어느 자료의 댓글인지 |
| `user_id` | 댓글 작성자 |
| `content` | 댓글 내용 |
| `created_at`, `updated_at` | 생성·수정 시간 |

자료가 삭제되면 연결 댓글은 같이 삭제됩니다.

```text
Source 삭제
  ↓ onDelete: Cascade
Comment 삭제
```

반대로 사용자를 삭제할 때는 자료와 댓글이 남아 있으면 제한됩니다. 작성자 데이터가 사라졌는데 자료만 남는 상태를 피하기 위해 `Restrict`를 사용합니다.

## tags와 source_tags

tag는 여러 자료에서 재사용할 수 있습니다. 그래서 `sources`에 tag 이름을 문자열 배열로 직접 넣지 않고 중간 table을 둡니다.

```text
sources N ─ source_tags ─ N tags
```

`tags.normalized_name`은 unique입니다.

```text
" RAG "  → "RAG" 표시
"rag"    → "rag" 표시
normalized_name: "rag"
```

이렇게 하면 대소문자나 공백 차이로 같은 tag가 중복 생성되는 일을 줄일 수 있습니다.

## 안정적인 서버 페이징

목록은 최신순으로 정렬합니다.

```text
ORDER BY created_at DESC, id DESC
```

`created_at`만 쓰면 같은 시각에 생성된 row들의 순서가 흔들릴 수 있습니다. `id`를 두 번째 정렬 기준으로 넣으면 같은 timestamp 안에서도 순서를 안정적으로 만들 수 있습니다.

## seed 데이터

Phase 3 seed는 개발과 E2E 확인을 위해 다음 데이터를 만듭니다.

```text
인증 완료 사용자 2명
자료 13개
각 자료의 댓글
Architecture/Web tag
```

자료가 13개인 이유는 기본 페이지 크기 12개에서 두 번째 페이지가 생기는지 확인하기 위해서입니다.

```bash
pnpm db:seed
```

주의할 점은 `apps/api/prisma/seed.ts`가 root `.env`를 직접 읽지 않는다는 것입니다. 기본값이 아닌 DB URL이나 seed 비밀번호를 쓰려면 shell 환경변수로 전달해야 합니다.

## 기억할 것

- 업무 데이터는 인증 데이터와 분리해서 생각합니다.
- source 삭제는 comment와 source-tag를 함께 정리해야 합니다.
- tag는 display name과 normalized name을 구분합니다.
- 서버 페이징은 항상 안정적인 정렬 기준을 가져야 합니다.
- seed 데이터는 기능 시연뿐 아니라 페이징과 E2E 검증의 기준입니다.
