# SourceLink Wiki Phase 6 작업 인계서

> - 마지막 갱신: 2026-06-25 (Asia/Seoul)
> - Phase 상태: EC2/GHCR 배포 배선 구현 완료, 실제 AWS 배포 대기

## 완료 범위

- 운영용 Compose 파일 `compose.production.yaml` 추가
- 운영용 Caddy HTTPS 설정 `infra/Caddyfile.production` 추가
- 운영 환경 변수 예시 `.env.production.example` 추가
- `.gitignore`에서 `.env.production.example`만 추적되도록 예외 추가
- GitHub Actions `Deploy` workflow 추가
- `CI` workflow가 `main`에서 성공하면 `Deploy` workflow가 실행되도록 구성
- 수동 `workflow_dispatch` 배포 실행 지원
- GHCR Web/API image build·push 구성
- image tag 정책: `<git-sha>` immutable tag와 `main` moving tag 동시 push
- EC2 SSH 접속, `/opt/sourcewiki` 파일 업로드, GHCR login, pull, migration, `up -d`, HTTPS smoke 순서 구성
- 운영 Compose에서 Mailpit 제외
- 운영 DB host port 비공개
- 운영 API 기본값: `COOKIE_SECURE=true`, `AI_MODE=demo`
- 운영 Web server-side API URL: `http://api:4000`
- Phase 6 배포 runbook `docs/13-deployment-runbook.md` 추가
- `docs/11-current-infrastructure.md`를 Phase 5 이후 CI/CD/Compose 상태로 최신화
- `docs/09-development-roadmap.md` Phase 6 기준 구체화
- README에 AI 모드, 운영 배포 기준, Phase 6 문서 링크 추가

## 추가된 주요 파일

```text
.env.production.example
.github/workflows/deploy.yml
compose.production.yaml
infra/Caddyfile.production
docs/13-deployment-runbook.md
process-docs/phase-06-handoff.md
```

갱신 파일:

```text
.gitignore
README.md
docs/09-development-roadmap.md
docs/11-current-infrastructure.md
```

## 배포 Workflow 요약

`Deploy` workflow는 `CI` workflow가 `main` branch에서 성공하면 실행된다. 수동 실행도 가능하다.

1. repository checkout
2. 배포 대상 commit SHA 계산
3. GHCR image 이름 생성
4. Docker Buildx 준비
5. GHCR login
6. API image build/push
7. Web image build/push
8. SSH key 준비
9. EC2 `/opt/sourcewiki/infra` 생성
10. `compose.production.yaml` 업로드
11. `infra/Caddyfile.production` 업로드
12. EC2에서 `.env.production` 존재 확인
13. EC2에서 GHCR login
14. `docker compose pull`
15. `docker compose run --rm api pnpm --filter @sourcewiki/api db:deploy`
16. `docker compose up -d`
17. `docker compose ps`
18. HTTPS smoke

Push되는 image:

```text
ghcr.io/<owner>/sourcewiki-api:<git-sha>
ghcr.io/<owner>/sourcewiki-web:<git-sha>
ghcr.io/<owner>/sourcewiki-api:main
ghcr.io/<owner>/sourcewiki-web:main
```

## 필요한 GitHub Secrets

```text
EC2_HOST      EC2 public IP 또는 SSH 접속 가능한 host
EC2_USER      예: ubuntu
EC2_SSH_KEY   EC2 접속 private key 전체 내용
GHCR_TOKEN    GHCR image pull 가능한 GitHub access token
APP_DOMAIN    HTTPS smoke에 사용할 실제 domain
```

메모:

- GHCR push는 workflow의 `github.token`을 사용한다.
- `GHCR_TOKEN`은 EC2에서 `docker login ghcr.io` 후 image pull에 사용한다.
- private package이면 `GHCR_TOKEN`에는 최소 `read:packages` 권한이 필요하다.

## EC2에 사용자가 준비해야 할 것

1. Ubuntu EC2 생성
2. Security Group 설정
   - `22/tcp`: 관리자 IP만 허용
   - `80/tcp`: 전체 공개
   - `443/tcp`: 전체 공개
3. DNS A record를 EC2 public IP로 연결
4. Docker Engine과 Docker Compose plugin 설치
5. 배포 user를 `docker` group에 추가
6. `/opt/sourcewiki` 생성 및 배포 user 소유로 변경
7. `/opt/sourcewiki/.env.production` 생성

`.env.production`은 `.env.production.example`을 기준으로 작성한다. 필수 교체값:

```text
APP_DOMAIN
APP_URL
POSTGRES_PASSWORD
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
SMTP_HOST
SMTP_PORT
SMTP_FROM
```

운영 기본값:

```text
COOKIE_SECURE=true
AI_MODE=demo
API_INTERNAL_URL=http://api:4000
```

## 검증 상태

성공:

```text
pnpm format:check
docker compose config --quiet
env SOURCEWIKI_API_IMAGE=ghcr.io/example/sourcewiki-api:test SOURCEWIKI_WEB_IMAGE=ghcr.io/example/sourcewiki-web:test docker compose --env-file .env.production.example -f compose.production.yaml config --quiet
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/deploy.yml")'
git diff --check
```

이번 세션에서 실행하지 않은 것:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
실제 GHCR push
실제 EC2 SSH 배포
실제 HTTPS smoke
실제 SMTP 가입 메일 smoke
```

## 확인된 주의점

- 실제 AWS/EC2/DNS 값이 아직 없으므로 CD는 로컬 문법 검증까지만 완료됐다.
- EC2 `/opt/sourcewiki/.env.production`은 workflow가 생성하지 않는다. 사용자가 서버에 직접 만들어야 한다.
- workflow는 `test -f .env.production`으로 env 파일 존재만 확인한다. 값의 정확성은 첫 배포와 smoke에서 검증된다.
- production Compose는 `--env-file .env.production`으로 값을 주입해야 한다.
- 운영 Caddy는 `APP_DOMAIN` 기준 자동 HTTPS를 사용한다. DNS가 EC2로 연결되지 않으면 인증서 발급과 smoke가 실패한다.
- 운영 Compose는 Mailpit을 실행하지 않는다. 실제 SMTP credential이 필요하다.
- API Dockerfile은 container start 시에도 `pnpm --filter @sourcewiki/api db:deploy`를 실행한다. Deploy workflow에서도 별도 migration step을 실행하므로 migration은 idempotent해야 한다.
- Web/API Dockerfile은 아직 multi-stage runtime image로 최적화하지 않았다. Phase 6의 기능 배선이 우선이고, 이미지 최적화는 후속 개선으로 남았다.
- Rollback은 이전 `<git-sha>` image tag를 수동 지정해 `docker compose pull/up -d` 하는 방식이다.

## 첫 배포 권장 순서

1. AWS EC2 생성
2. DNS A record 연결
3. EC2에 Docker/Compose 설치
4. `/opt/sourcewiki/.env.production` 작성
5. GitHub Secrets 등록
6. `main` push 또는 `Deploy` workflow 수동 실행
7. Actions log에서 GHCR push와 EC2 deploy 확인
8. HTTPS smoke 확인
9. 브라우저에서 가입 메일, 로그인, source CRUD, 댓글 CRUD, AI demo badge 확인

## 수동 Smoke 체크리스트

```text
1. https://<domain>/ 접속
2. https://<domain>/api/health/live 확인
3. https://<domain>/api/health/ready 확인
4. https://<domain>/api/openapi.json 확인
5. https://<domain>/api/docs/ 확인
6. 회원가입 후 실제 SMTP 메일 수신
7. 인증 링크로 이메일 인증
8. 로그인
9. 자료 생성/상세/수정/삭제
10. 댓글 생성/수정/삭제
11. rawText가 있는 자료에서 AI 요약 요청
12. demo badge와 초안 UI 확인
13. 요약 적용 후 새로고침해 저장 결과 확인
```

## 다음 단계

- 실제 EC2/DNS/GitHub Secrets 준비
- 첫 `Deploy` workflow 실행
- 운영 HTTPS smoke와 실제 SMTP smoke
- 실패 시 Actions log와 EC2 `docker compose logs` 기준으로 수정
- 안정화 후 Web/API Dockerfile multi-stage runtime image 최적화
- `pg_dump` 백업과 restore dry-run runbook 보강
