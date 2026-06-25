# Phase 6 배포 Runbook

> 기준: 새 AWS EC2, GHCR, 운영 AI demo 모드, 실제 SMTP

## 목표

Phase 6의 목표는 `main` 브랜치 검증 후 Web/API 이미지를 GHCR에 push하고, EC2에서 migration과 Compose 배포를 수행한 뒤 HTTPS smoke를 통과하는 것이다.

운영 환경에서는 Ollama를 필수 의존성으로 두지 않는다. 제출 안정성을 위해 `AI_MODE=demo`를 기본으로 사용하고, 화면과 API 응답에는 demo 표시를 유지한다.

## 운영 구성

```text
사용자
  |
  | https://APP_DOMAIN
  v
Caddy (:80/:443)
  |-- /api/* -> api:4000 -> PostgreSQL
  `-- 그 외  -> web:3000
```

운영 Compose는 로컬 개발용 `compose.yaml`과 분리된 [`compose.production.yaml`](../compose.production.yaml)을 사용한다.

- `db`: `postgres:17-alpine`, host port 비공개, named volume 사용
- `api`: GHCR에서 pull한 immutable image tag 실행
- `web`: GHCR에서 pull한 immutable image tag 실행
- `caddy`: 80/443 공개, 자동 HTTPS, Web/API reverse proxy
- `mailpit`: 운영에서 제외

## EC2 준비

1. Ubuntu 기반 EC2를 생성한다.
2. Security Group은 다음만 허용한다.
   - `22/tcp`: 관리자 IP로 제한
   - `80/tcp`: 전체 공개
   - `443/tcp`: 전체 공개
3. Docker Engine과 Docker Compose plugin을 설치한다.
4. 배포 사용자를 `docker` group에 추가한다.
5. 애플리케이션 디렉터리를 만든다.

```bash
sudo mkdir -p /opt/sourcewiki
sudo chown "$USER":"$USER" /opt/sourcewiki
cd /opt/sourcewiki
```

6. `.env.production.example`을 기준으로 `/opt/sourcewiki/.env.production`을 작성한다.
7. GHCR private image를 쓸 경우 서버에서 registry login을 수행한다.

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
```

## 운영 환경 변수

`.env.production`은 EC2에 직접 배치하고 Git에 커밋하지 않는다.

```env
NODE_ENV=production
LOG_LEVEL=info
APP_DOMAIN=example.com
APP_URL=https://example.com
POSTGRES_DB=sourcewiki
POSTGRES_USER=sourcewiki
POSTGRES_PASSWORD=replace-with-strong-password
DATABASE_URL=postgresql://sourcewiki:replace-with-strong-password@db:5432/sourcewiki?schema=public
JWT_ACCESS_SECRET=replace-with-strong-secret
JWT_REFRESH_SECRET=replace-with-strong-secret
JWT_ISSUER=sourcewiki-api
JWT_AUDIENCE=sourcewiki-web
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_FROM=noreply@example.com
COOKIE_SECURE=true
AI_MODE=demo
AI_TIMEOUT_MS=180000
API_INTERNAL_URL=http://api:4000
```

Ollama 관련 값은 운영 demo 모드에서는 필수 값이 아니다. 실제 Ollama smoke는 로컬 또는 별도 시연 환경에서만 수행한다.

## GHCR 이미지 정책

GitHub Actions는 CI workflow가 성공한 `main` commit에 대해 다음 tag를 push한다.

- `ghcr.io/<owner>/sourcewiki-api:<git-sha>`
- `ghcr.io/<owner>/sourcewiki-web:<git-sha>`
- 선택적으로 `:main`을 최신 main 포인터로 갱신

EC2 배포는 rollback을 위해 기본적으로 `<git-sha>` tag를 사용한다. `latest`만으로 운영 배포하지 않는다.

## GitHub Actions CD 흐름

[`Deploy`](../.github/workflows/deploy.yml) workflow는 `CI` workflow가 `main`에서 성공한 뒤 실행한다. 수동 실행도 가능하다.

1. `pnpm install --frozen-lockfile`
2. `pnpm db:deploy`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test`
6. `pnpm build`
7. `pnpm format:check`
8. Web/API Docker image build
9. GHCR login
10. GHCR push
11. SSH로 EC2 접속
12. image tag 값을 workflow 환경 변수로 EC2 Compose 명령에 전달
13. `docker compose pull`
14. `docker compose run --rm api pnpm --filter @sourcewiki/api db:deploy` 또는 production image 안의 동등한 migration command 실행
15. `docker compose up -d`
16. HTTPS smoke 실행

필요한 GitHub secret:

- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `GHCR_TOKEN`: EC2에서 GHCR image를 pull할 수 있는 token. private package면 `read:packages` 권한이 필요하다.
- `APP_DOMAIN`

Workflow의 GHCR push는 `github.token`을 사용한다. 서버 pull 권한은 `GHCR_TOKEN` secret으로 전달해 배포 시 `docker login ghcr.io`를 수행한다.

## 배포 Smoke

배포 후 다음을 HTTPS 기준으로 확인한다.

```bash
curl --fail https://example.com/
curl --fail https://example.com/api/health/live
curl --fail https://example.com/api/health/ready
curl --fail https://example.com/api/openapi.json
curl --fail https://example.com/api/docs/
```

브라우저 수동 smoke:

1. 회원가입 후 실제 SMTP 메일 수신 확인
2. 인증 링크로 이메일 인증 완료
3. 로그인
4. 자료 생성, 상세 조회, 수정, 삭제 권한 확인
5. 댓글 생성, 수정, 삭제 권한 확인
6. rawText가 있는 자료에서 AI 요약 요청
7. demo badge와 초안 검토 UI 확인
8. 요약 적용 후 새로고침해 저장 결과 확인

## Rollback

애플리케이션 rollback은 이전에 성공한 image tag로 되돌린다.

```bash
cd /opt/sourcewiki
SOURCEWIKI_API_IMAGE=ghcr.io/<owner>/sourcewiki-api:<previous-sha> \
SOURCEWIKI_WEB_IMAGE=ghcr.io/<owner>/sourcewiki-web:<previous-sha> \
docker compose --env-file .env.production -f compose.production.yaml pull

SOURCEWIKI_API_IMAGE=ghcr.io/<owner>/sourcewiki-api:<previous-sha> \
SOURCEWIKI_WEB_IMAGE=ghcr.io/<owner>/sourcewiki-web:<previous-sha> \
docker compose --env-file .env.production -f compose.production.yaml up -d

SOURCEWIKI_API_IMAGE=ghcr.io/<owner>/sourcewiki-api:<previous-sha> \
SOURCEWIKI_WEB_IMAGE=ghcr.io/<owner>/sourcewiki-web:<previous-sha> \
docker compose --env-file .env.production -f compose.production.yaml ps
```

DB migration은 즉시 되돌리는 전략을 기본으로 하지 않는다. 운영 migration은 expand/contract 원칙을 따른다.

- 같은 배포에서 destructive migration을 넣지 않는다.
- 새 컬럼 추가와 코드 전환을 먼저 배포한다.
- 불필요한 컬럼 삭제는 후속 배포에서 수행한다.
- rollback 대상 코드는 직전 schema와 호환되어야 한다.

## 백업과 복구

PostgreSQL volume은 EC2 내부 비공개 volume으로 유지한다. 최소 운영 백업은 정기 `pg_dump`와 외부 보관이다.

```bash
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > sourcewiki-$(date +%Y%m%d%H%M%S).sql
```

복구 runbook은 실제 운영 데이터가 생기기 전에 별도로 dry-run한다.

## 완료 기준

- `main` push 후 CI/CD workflow가 green이다.
- GHCR에 Web/API image가 git sha tag로 존재한다.
- EC2의 `docker compose ps`에서 주요 서비스가 healthy다.
- HTTPS에서 Web, readiness, Swagger가 열린다.
- 실제 SMTP 인증 메일이 수신된다.
- CRUD, 댓글, AI demo 요약 smoke가 통과한다.
- 이전 image tag rollback 절차가 문서상 검토됐다.
