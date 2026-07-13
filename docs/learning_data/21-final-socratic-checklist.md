# 21. 최종 소크라틱 점검

이 장의 목표는 답을 읽는 것이 아니라, 답을 못 했을 때 **어느 파일·어느 문서로 돌아가야 하는지** 아는 것이다.

## 단계 1: 코드 없이 설명하기

각 질문에 30초 안에 답한다.

1. SourceWiki에서 Web, API, DB는 각각 무엇을 책임지는가?
2. 브라우저가 DB에 직접 연결하지 않는 이유는?
3. TanStack Query와 useState/React Hook Form의 상태를 왜 나누었는가?
4. access/refresh token을 왜 두 개로 나누었는가?
5. refresh token 재사용이 왜 위험한가?
6. Tag를 배열이 아니라 별도 테이블·연결 테이블로 둔 이유는?
7. Docker Compose와 Caddy가 각각 해결하는 문제는?
8. 개발 Mailpit과 운영 SMTP의 차이는?
9. migration이 seed와 다른 이유는?
10. 사용자가 다른 사람 자료 수정 API를 호출하면 어디서 막히는가?

## 단계 2: 코드 근거 찾기

아래 질문의 답을 파일을 열어 증명한다.

| 질문 | 첫 파일 | 다음 파일 |
| --- | --- | --- |
| JWT claim/만료 | `api/src/lib/jwt.ts` | `auth.service.ts` |
| 쿠키 옵션 | `auth.routes.ts` | `api-client.ts` |
| 로그인 사용자 상태 | `use-me-query.ts` | `query-provider.tsx` |
| 401 refresh | `api-client.ts` | `auth.routes.ts`/`auth.service.ts` |
| 자료 작성 권한 | `source.routes.ts` | `authorize.ts`/`source.service.ts` |
| DB 관계 | `prisma/schema.prisma` | migration SQL |
| 배포 | `.github/workflows/deploy.yml` | Compose/Caddy production 파일 |

## 단계 3: 꼬리 질문으로 사고 넓히기

| 기본 답 | 꼬리 질문 | 좋은 답의 방향 |
| --- | --- | --- |
| Query를 썼다 | 왜 global store가 아닌가? | 서버 상태의 source of truth·cache 필요성 |
| 쿠키를 쓴다 | localStorage보다 항상 안전한가? | XSS 노출 감소와 CSRF/Origin 고려를 함께 말함 |
| JWT를 쓴다 | JWT만으로 logout 가능한가? | refresh session DB의 revoke가 필요함 |
| Prisma를 쓴다 | DB 제약이 필요 없는가? | ORM과 PostgreSQL 제약은 함께 필요함 |
| Caddy를 쓴다 | API 포트를 공개하지 않는 이유는? | same-origin·TLS·공격면 축소 |

## 단계 4: 장애를 역으로 추론하기

### 사례 A — 가입 버튼 뒤 503, users 테이블에는 행 존재

1. 무엇이 성공했는가? User와 verification token 저장.
2. 다음 실패 지점은? SMTP 메일 발송.
3. 재가입이 맞는가? 아니다. SMTP 수정 후 재전송이 맞다.

### 사례 B — 새로고침 후 헤더가 로그인으로 보임

1. Query cache는 새로고침 때 유지되는가? 메모리 cache라 사라진다.
2. 복구 수단은? 브라우저 cookie + `/api/auth/me`.
3. `/me`가 401이면? refresh 가능성을 공통 apiFetch가 판단한다.

### 사례 C — DBeaver에 테이블이 안 보임

1. migration이 실제로 실패했는가? `No pending migrations`이면 아닐 수 있다.
2. 먼저 확인할 것은? 현재 연결한 database가 `sourcewiki`인지, schema가 `public`인지.
3. API와 DBeaver가 같은 `DATABASE_URL` 대상인가?

## 발표 직전 최종 체크

- 각 기술을 “무엇을 썼다”가 아니라 “어떤 문제를 해결한다”로 설명한다.
- 코드 근거를 하나 이상 제시한다.
- 구현하지 않은 기능을 구현했다고 말하지 않는다.
- 보안은 프론트 redirect 하나가 아니라 cookie/API middleware/DB 상태가 함께 만든다고 설명한다.
- AI는 현재 demo 모드임을 명확히 말한다.
