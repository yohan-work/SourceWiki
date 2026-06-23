# SourceWiki 학습 노트

이 폴더는 SourceWiki 프로젝트를 이해하기 위한 학습용 문서입니다. 처음 보는 사람이 프로젝트 기반부터 회원가입, 이메일 인증, JWT 로그인, 자료·댓글 CRUD, URL 본문 추출까지 단계적으로 따라갈 수 있도록 쉬운 설명을 기준으로 정리했습니다.

## 먼저 알아야 할 큰 그림

SourceWiki는 하나의 Node 앱만 실행하는 구조가 아닙니다.

```text
SourceWiki
├─ apps/web             Next.js 프론트엔드
├─ apps/api             Express 백엔드 API
├─ packages/shared      web과 api가 같이 쓰는 타입/스키마
├─ compose.yaml         Docker로 실행할 서비스 목록
├─ infra/Caddyfile      Caddy reverse proxy 설정
└─ .github/workflows    GitHub Actions CI 설정
```

로컬 개발 때는 보통 이렇게 실행합니다.

```bash
pnpm dev:infra
pnpm dev
```

의미는 다음과 같습니다.

- `pnpm dev:infra`: Docker로 PostgreSQL DB와 Mailpit을 먼저 실행합니다.
- `pnpm dev`: 내 컴퓨터의 Node.js로 web과 api를 동시에 실행합니다.

전체를 Docker로 실행할 때는 이렇게 실행합니다.

```bash
pnpm docker:up
```

이 경우 Docker Compose가 `mailpit`, `db`, `api`, `web`, `caddy`를 함께 실행합니다.

## 문서 읽는 순서

1. [모노레포와 pnpm](./01-monorepo-pnpm.md)
2. [Docker, PostgreSQL, Docker Compose](./02-docker-compose-postgres.md)
3. [Caddy와 GitHub Actions CI](./03-caddy-ci.md)
4. [자주 쓰는 명령어와 문제 해결](./04-commands-troubleshooting.md)
5. [Phase 2 인증의 전체 흐름](./05-phase2-auth-overview.md)
6. [사용자 DB 모델과 Prisma migration](./06-auth-database-prisma.md)
7. [회원가입과 Mailpit 이메일 인증](./07-signup-email-verification.md)
8. [JWT 로그인, refresh rotation, 보안](./08-jwt-session-security.md)
9. [프론트엔드 인증 상태와 화면](./09-frontend-auth-flow.md)
10. [인증 테스트와 디버깅](./10-auth-testing-debugging.md)
11. [Phase 3 자료·댓글 DB 모델](./11-core-crud-database.md)
12. [Source·Comment API와 권한 검증](./12-core-crud-api-permissions.md)
13. [자료·댓글 프론트엔드 흐름](./13-source-frontend-flow.md)
14. [Phase 3 테스트와 E2E 검증](./14-core-crud-testing-e2e.md)
15. [URL 본문 추출과 SSRF 방어](./15-url-extraction-security.md)
16. [URL 추출 프론트엔드 흐름과 테스트](./16-url-extraction-frontend-testing.md)

## 한 문장 요약

이 프로젝트는 `pnpm`으로 여러 Node 패키지를 한 저장소에서 관리하고, Docker로 인프라를 실행하며, Web과 API가 공유 schema를 기준으로 이메일 인증, 회전형 JWT session, 자료·댓글 CRUD, 안전한 URL 본문 추출을 처리합니다.
