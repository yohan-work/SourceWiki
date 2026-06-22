# SourceWiki 학습 노트

이 폴더는 SourceWiki 프로젝트를 이해하기 위한 학습용 문서입니다. 처음 보는 사람이 `pnpm`, 모노레포, Docker, PostgreSQL, Caddy, GitHub Actions CI를 한 번에 따라갈 수 있도록 쉬운 설명을 기준으로 정리했습니다.

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

- `pnpm dev:infra`: Docker로 PostgreSQL DB만 먼저 실행합니다.
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

## 한 문장 요약

이 프로젝트는 `pnpm`으로 여러 Node 패키지를 한 저장소에서 관리하고, Docker로 DB와 운영에 가까운 실행 환경을 만들며, GitHub Actions에서 코드 품질과 Docker 실행 가능 여부를 자동으로 검증합니다.
