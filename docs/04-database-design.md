# 데이터베이스 설계

## 관계 개요

```text
users 1 ── N sources
users 1 ── N comments
sources 1 ── N comments
users 1 ── N email_verification_tokens
users 1 ── N refresh_sessions
sources N ── M tags (source_tags)
```

PostgreSQL과 Prisma를 사용한다. 모든 PK는 UUID, 시간은 UTC `timestamptz`로 저장하며 API에서 ISO 8601로 반환한다. DB 컬럼은 snake_case, TypeScript 모델은 camelCase로 매핑한다.

## 테이블

### `users`

| 필드 | 타입/제약 | 설명 |
| --- | --- | --- |
| id | UUID PK | 사용자 ID, JWT `sub` |
| email | varchar(320) UNIQUE NOT NULL | trim·소문자 정규화 이메일 |
| password_hash | varchar NOT NULL | bcrypt cost 12 결과 |
| nickname | varchar(2~30) NOT NULL | 공개 작성자명 |
| email_verified_at | timestamptz NULL | null이면 미인증 |
| created_at / updated_at | timestamptz NOT NULL | 생성·수정 시각 |

`email` 고유 제약은 동시 가입 경쟁 조건의 최종 방어선이다. 응답에서는 `password_hash`를 절대 select하지 않는다.

### `email_verification_tokens`

| 필드 | 타입/제약 | 설명 |
| --- | --- | --- |
| id | UUID PK | 내부 ID |
| user_id | UUID FK users | 대상 사용자 |
| token_hash | char(64) UNIQUE | SHA-256 해시 |
| expires_at | timestamptz | 30분 만료 |
| used_at | timestamptz NULL | 사용 시각 |
| created_at | timestamptz | 생성 시각 |

인증·재발송 시 transaction에서 해당 사용자의 기존 미사용 토큰을 폐기한다. `(user_id, expires_at)` 인덱스를 둔다. 사용 완료 토큰은 7일 후 정리한다.

### `refresh_sessions`

| 필드 | 타입/제약 | 설명 |
| --- | --- | --- |
| id | UUID PK | JWT `jti`와 별도 세션 식별자 |
| user_id | UUID FK users | 소유 사용자 |
| family_id | UUID NOT NULL | 회전 체인 ID |
| token_hash | char(64) UNIQUE | refresh JWT 해시 |
| expires_at | timestamptz | 세션 만료 |
| revoked_at | timestamptz NULL | 로그아웃·재사용 탐지 폐기 |
| replaced_by_id | UUID NULL | 다음 회전 세션 |
| created_at | timestamptz | 생성 시각 |

refresh 때 현재 hash가 유효하면 한 transaction에서 현재 세션을 폐기하고 새 세션을 생성한다. 폐기 토큰이 다시 제시되면 같은 `family_id`의 활성 세션을 모두 폐기한다. `(user_id, revoked_at)`, `family_id` 인덱스를 둔다.

### `sources`

| 필드 | 타입/제약 | 설명 |
| --- | --- | --- |
| id | UUID PK | 자료 ID |
| user_id | UUID FK users NOT NULL | 작성자 |
| title | varchar(200) NOT NULL | 자료 제목 |
| original_url | varchar(2048) NOT NULL | 공개 HTTP(S) URL |
| source_domain | varchar(253) NOT NULL | URL hostname |
| source_type | enum | article/docs/paper/github/other |
| raw_text | text NULL | 정제 텍스트, 최대 100,000자 |
| raw_text_preview | varchar(300) NULL | 목록용 미리보기 |
| summary | text NULL | 사용자 편집 가능한 요약 |
| key_points | jsonb NOT NULL default `[]` | 문자열 배열, 최대 10개 |
| keywords | jsonb NOT NULL default `[]` | 문자열 배열, 최대 20개 |
| personal_note | text NULL | 최대 10,000자 |
| extraction_status | enum | not_requested/succeeded/failed |
| summary_status | enum | not_requested/succeeded/failed/demo |
| created_at / updated_at | timestamptz | 생성·수정 시각 |

`(created_at DESC, id DESC)`와 `user_id`에 인덱스를 둔다. URL 중복은 허용한다. 여러 사용자가 같은 자료에 서로 다른 요약·메모를 작성할 수 있기 때문이다. `raw_text_preview`는 저장 시 생성하며 목록에서 전문을 조회하지 않는다.

### `comments`

| 필드 | 타입/제약 | 설명 |
| --- | --- | --- |
| id | UUID PK | 댓글 ID |
| source_id | UUID FK sources NOT NULL | 대상 자료 |
| user_id | UUID FK users NOT NULL | 작성자 |
| content | varchar(2000) NOT NULL | 댓글 내용 |
| created_at / updated_at | timestamptz | 생성·수정 시각 |

`(source_id, created_at ASC, id ASC)` 인덱스로 상세 댓글 조회를 지원한다. 자료 삭제 시 cascade, 사용자 삭제 정책 도입 전에는 사용자 삭제 기능을 제공하지 않는다.

### `tags`, `source_tags`

`tags`는 `id`, `name`, `normalized_name`, `created_at`을 가진다. `normalized_name`은 소문자·공백 정규화 후 UNIQUE이며 표시명은 최초 등록값을 쓴다.

`source_tags`는 `(source_id, tag_id)` 복합 PK와 두 FK를 갖는다. 자료 저장·수정 시 태그 upsert와 연결 교체를 transaction으로 처리한다. 자료 삭제 시 연결은 cascade, 사용되지 않는 태그 정리는 별도 maintenance 작업으로 둔다.

## 삭제와 권한

인가의 기준은 DB FK가 아니라 서비스 계층의 `user_id === authenticatedUserId` 비교다. UPDATE/DELETE 쿼리에 `id`와 `user_id`를 함께 조건으로 넣어 확인과 변경 사이 경쟁 조건을 줄인다.

- source 삭제: comments, source_tags cascade 삭제
- user 삭제: 제출 범위 밖이며 FK는 restrict
- tag 삭제: source_tags cascade 삭제, 관리자 기능은 제출 범위 밖
- refresh/email token: user 삭제가 추가될 경우 cascade 대상

## 원문 정책

- HTML, cookie, 응답 header, binary 파일은 저장하지 않는다.
- Unicode 기준 최대 100,000자이며 초과분은 추출 단계에서 자르고 사용자에게 표시한다.
- 목록 쿼리는 `raw_text`를 select하지 않는다.
- 민감정보 신고·삭제 정책은 운영 확장 항목이며 MVP에서는 작성자 삭제와 관리자 DB 대응 절차를 README에 명시한다.

## migration 및 seed

Prisma migration은 소스에 커밋하고 운영 배포에서 `prisma migrate deploy`만 사용한다. seed는 로컬·시연 환경에서만 실행하며 공개 저장소에 실제 계정 credential을 넣지 않는다. 초기 seed는 인증 완료 사용자 2명, 자료 13개 이상, 댓글을 포함해 페이징과 권한을 검증할 수 있게 한다.

## 후속 `source_links` 설계

관련 자료 추천은 제출 범위에서 제외하므로 초기 migration에는 넣지 않는다. 기능을 시작할 때 `source_links(id, source_id, linked_source_id, similarity_score, relation_type, relation_reason, created_by_user_id, created_at)`를 추가한다.

- 두 source FK는 자료 삭제 시 cascade한다.
- 자기 자신 연결은 check constraint로 금지한다.
- 방향 없는 관계는 애플리케이션에서 작은 UUID를 `source_id`에 배치하고 두 ID 조합을 UNIQUE로 만든다.
- 추천 후보는 이 테이블에 저장하지 않는다. 사용자가 승인한 연결만 저장하며 `created_by_user_id`로 삭제 권한을 판단한다.
- `similarity_score`는 후보 산정 당시 참고값이고 사용자 승인 관계의 진실 공급원이 아니다.
