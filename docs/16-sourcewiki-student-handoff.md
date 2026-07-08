SourceWiki Azure Deploy Handoff for Codex
0. Goal

SourceWiki를 Azure for Students 환경에 제출용으로 배포한다.

최종 제출 URL:

Web Service: https://sourcewiki.eastasia.cloudapp.azure.com/
Swagger UI: https://sourcewiki.eastasia.cloudapp.azure.com/api/docs/
OpenAPI JSON: https://sourcewiki.eastasia.cloudapp.azure.com/api/openapi.json

Smoke 목표:

회원가입
Gmail 이메일 인증
로그인
자료 CRUD
댓글 CRUD
페이징
AI_MODE=demo badge
Swagger UI
OpenAPI JSON
/api/health/ready 200
1. Local Repository

로컬 저장소 위치:

/Users/yohan.choi/Documents/projects/SourceWiki

현재 Azure 배포 관련 준비 상태:

compose.azure.yaml 준비됨
compose.production.yaml 준비됨
infra/Caddyfile.production 준비됨
.github/workflows/deploy.yml 준비됨
.env.production.example 준비됨

검증 완료 명령:

SOURCEWIKI_API_IMAGE=ghcr.io/example/sourcewiki-api:test \
SOURCEWIKI_WEB_IMAGE=ghcr.io/example/sourcewiki-web:test \
docker compose --env-file .env.production.example \
  -f compose.production.yaml \
  -f compose.azure.yaml \
  config --quiet

Azure compose 기본 서비스 확인:

api
web
caddy

로컬 검증 완료:

pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check

참고:

sandbox에서는 supertest가 0.0.0.0 listen EPERM으로 실패했으나,
권한 상승 재실행 pnpm test는 통과했다.
2. Azure Subscription / Cost Guard

Subscription:

Azure for Students

Credit 상태 확인 완료:

사용 가능 크레딧: 약 ₩153,460
남은 기간: 약 364일

Budget 설정 완료:

Budget: US$1.00
계산된 지출: $0.00 기준으로 시작

주의:

Budget은 비용 차단이 아니라 알림이다.
현금 과금 방어는 Azure for Students spending limit에 의존한다.
3. Azure Resource Group

Resource Group:

rg-sourcewiki-student

Resource Group location:

Korea Central

실제 주요 리소스 location:

East Asia

현재 리소스 목록:

sourcewiki-postgres-yohan
sourcewiki-vm
sourcewiki-vm-ip
sourcewiki-vm-nsg
sourcewiki-vm-vnet
sourcewiki-vm456
sourcewiki-vm_key
sourcewiki-vm_OsDisk_...

자동 생성된 별도 리소스 그룹:

NetworkWatcherRG

NetworkWatcherRG는 Azure Network Watcher 자동 생성 리소스 그룹이므로 현재는 건드리지 않는다.

4. PostgreSQL Flexible Server

리소스:

sourcewiki-postgres-yohan

Type:

Azure Database for PostgreSQL Flexible Server

Region:

East Asia

Korea Central / Japan East는 policy violation으로 실패했고, East Asia에서 생성 성공함.

Server endpoint:

sourcewiki-postgres-yohan.postgres.database.azure.com

Admin user:

sourcewikiadmin

Database 생성 완료:

sourcewiki

DB config:

PostgreSQL version: 16
Compute: Burstable B1ms
vCore: 1
RAM: 2GiB
Storage: 32GiB
Storage performance: P4 120 IOPS
High availability: Disabled
Backup retention: 7 days
Storage auto-grow: Disabled
Geo-redundant backup: Disabled
Public access: Enabled
Allow all Azure services: Disabled

Firewall rules:

ClientIPAddress_2026-7-8_14-2-56
211.114.219.131 ~ 211.114.219.131

allow-sourcewiki-vm
52.175.60.225 ~ 52.175.60.225

Connection string template:

DATABASE_URL=postgresql://sourcewikiadmin:<POSTGRES_PASSWORD>@sourcewiki-postgres-yohan.postgres.database.azure.com:5432/sourcewiki?schema=public&sslmode=require

주의:

sslmode=require 필수.
비밀번호는 handoff 문서에 쓰지 말 것.
5. Azure VM

VM resource:

sourcewiki-vm

Region:

East Asia

Public IP:

52.175.60.225

DNS label:

sourcewiki

Final domain:

sourcewiki.eastasia.cloudapp.azure.com

VM size:

Standard B2s v2
2 vCPU
8GiB RAM
약 0.1170 USD/hr

선택 이유:

B1s, B1ms가 East Asia/Korea Central에서 NotAvailableForSubscription으로 사용 불가.
Standard B2s v2는 선택 가능했고 학생 크레딧 적용 표시 확인됨.

OS:

Ubuntu Server 24.04 LTS x64 Gen2

SSH user:

azureuser

SSH private key local path:

/Users/yohan.choi/Documents/projects/SourceWiki/sourcewiki-vm_key.pem

SSH 접속 성공 완료:

ssh -i /Users/yohan.choi/Documents/projects/SourceWiki/sourcewiki-vm_key.pem azureuser@sourcewiki.eastasia.cloudapp.azure.com

VM SSH prompt 확인됨:

azureuser@sourcewiki-vm:~$

NSG inbound rules:

SSH 22  → 211.114.219.131 only
HTTP 80 → Any
HTTPS 443 → Any

Disk:

OS disk: Standard SSD LRS
VM 삭제 시 OS disk 삭제: Enabled
VM 삭제 시 Public IP 및 NIC 삭제: Enabled

Monitoring / paid extras:

Boot diagnostics: Disabled
Guest diagnostics: Disabled
Application health monitoring: Disabled
Backup: Disabled
Defender: Basic free
Managed identity: Disabled
6. VM Current Setup

Docker 설치 완료:

docker --version
# Docker version 29.6.1, build 8900f1d

docker compose version
# Docker Compose version v5.3.1

배포 디렉터리는 아래 명령까지만 진행 예정:

sudo mkdir -p /opt/sourcewiki/infra
sudo chown "$USER":"$USER" /opt/sourcewiki /opt/sourcewiki/infra

확인 명령:

ls -la /opt/sourcewiki
7. VM .env.production To Create

VM path:

/opt/sourcewiki/.env.production

Template:

NODE_ENV=production
LOG_LEVEL=info

APP_DOMAIN=sourcewiki.eastasia.cloudapp.azure.com
APP_URL=https://sourcewiki.eastasia.cloudapp.azure.com

POSTGRES_DB=sourcewiki
POSTGRES_USER=sourcewikiadmin
POSTGRES_PASSWORD=<azure-postgres-password>
DATABASE_URL=postgresql://sourcewikiadmin:<azure-postgres-password>@sourcewiki-postgres-yohan.postgres.database.azure.com:5432/sourcewiki?schema=public&sslmode=require

JWT_ACCESS_SECRET=<at-least-32-characters-access-secret>
JWT_REFRESH_SECRET=<at-least-32-characters-refresh-secret>
JWT_ISSUER=sourcewiki-api
JWT_AUDIENCE=sourcewiki-web

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=<gmail-address>
SMTP_USER=<gmail-address>
SMTP_PASSWORD=<gmail-app-password>
SMTP_SECURE=false

UPLOAD_DIR=/data/uploads
COOKIE_SECURE=true
AI_MODE=demo
AI_TIMEOUT_MS=180000
API_INTERNAL_URL=http://api:4000

JWT secret 생성 예시:

openssl rand -hex 32
openssl rand -hex 32

주의:

.env.production은 Git에 커밋 금지.
Gmail SMTP_PASSWORD는 일반 계정 비밀번호가 아니라 Gmail 앱 비밀번호 사용.
SMTP_PORT=587, SMTP_SECURE=false 유지.
8. GitHub Secrets To Configure

현재 workflow는 EC2_* 이름을 유지하지만 Azure VM에 사용한다.

GitHub repository secrets:

EC2_HOST    = sourcewiki.eastasia.cloudapp.azure.com
EC2_USER    = azureuser
EC2_SSH_KEY = /Users/yohan.choi/Documents/projects/SourceWiki/sourcewiki-vm_key.pem 파일 내용 전체
GHCR_TOKEN  = GHCR package pull 권한 token
APP_DOMAIN  = sourcewiki.eastasia.cloudapp.azure.com

주의:

APP_DOMAIN에는 https:// 붙이지 않음.
EC2_HOST에는 DNS 또는 IP만 입력.
EC2_SSH_KEY는 private key 전체를 줄바꿈 유지해서 저장.
9. Expected GitHub Actions Deploy Flow

.github/workflows/deploy.yml이 수행해야 하는 흐름:

1. Web/API Docker image build
2. GHCR push
3. Azure VM SSH 접속
4. compose.production.yaml, compose.azure.yaml, infra/Caddyfile.production 업로드
5. VM에서 /opt/sourcewiki/.env.production 존재 확인
6. GHCR login
7. docker compose pull
8. Prisma migration 실행
9. docker compose up -d
10. HTTPS smoke

예상 VM compose command:

cd /opt/sourcewiki

docker compose --env-file .env.production \
  -f compose.production.yaml \
  -f compose.azure.yaml \
  pull

docker compose --env-file .env.production \
  -f compose.production.yaml \
  -f compose.azure.yaml \
  run --rm api pnpm --filter @sourcewiki/api db:deploy

docker compose --env-file .env.production \
  -f compose.production.yaml \
  -f compose.azure.yaml \
  up -d

docker compose --env-file .env.production \
  -f compose.production.yaml \
  -f compose.azure.yaml \
  ps
10. Post Deploy Checks

VM에서:

cd /opt/sourcewiki

docker compose --env-file .env.production \
  -f compose.production.yaml \
  -f compose.azure.yaml \
  ps

docker compose --env-file .env.production \
  -f compose.production.yaml \
  -f compose.azure.yaml \
  logs api

docker compose --env-file .env.production \
  -f compose.production.yaml \
  -f compose.azure.yaml \
  logs caddy

로컬 또는 Actions에서:

curl --fail https://sourcewiki.eastasia.cloudapp.azure.com/
curl --fail https://sourcewiki.eastasia.cloudapp.azure.com/api/health/live
curl --fail https://sourcewiki.eastasia.cloudapp.azure.com/api/health/ready
curl --fail https://sourcewiki.eastasia.cloudapp.azure.com/api/docs/
curl --fail https://sourcewiki.eastasia.cloudapp.azure.com/api/openapi.json

Browser smoke:

1. 회원가입
2. Gmail 인증 메일 수신
3. 이메일 인증
4. 로그인
5. 자료 생성
6. 자료 목록/상세 조회
7. 자료 수정
8. 댓글 생성
9. 댓글 수정/삭제
10. 자료 삭제
11. 페이징 확인
12. AI demo 요약 badge 확인
13. Swagger UI 확인
11. Known Risks / Checks for Codex
1. GHCR image name 확인 필요

현재 .env.production.example이나 workflow에 ghcr.io/example/... 같은 placeholder가 남아 있으면 실제 repo owner/name으로 수정해야 한다.

확인할 것:

SOURCEWIKI_API_IMAGE
SOURCEWIKI_WEB_IMAGE
GHCR package path
2. compose.azure.yaml 확인 필요

관리형 PostgreSQL을 사용하므로 Azure compose 기본 실행 서비스는 아래만이어야 한다.

api
web
caddy

local db service가 기본으로 뜨면 안 된다.

3. Caddyfile 확인 필요

최종 도메인:

sourcewiki.eastasia.cloudapp.azure.com

Caddy가 80/443으로 수신하고, 내부로 다음을 프록시해야 한다.

web:3000
api:4000

예상 route:

/              → web:3000
/api/*         → api:4000
/api/docs/*    → api:4000
/api/openapi.json → api:4000
4. VM에 업로드될 파일 위치 확인

GitHub Actions가 VM에 업로드해야 할 위치:

/opt/sourcewiki/compose.production.yaml
/opt/sourcewiki/compose.azure.yaml
/opt/sourcewiki/infra/Caddyfile.production

.env.production은 VM에 직접 작성하고 Actions가 덮어쓰면 안 된다.

5. PostgreSQL 상태

배포 전 PostgreSQL은 Ready 상태여야 한다.
Stop 상태면 DB 연결 실패.

6. VM 상태

배포 전 VM은 Running 상태여야 한다.
Stopped/deallocated면 GitHub Actions SSH 실패.

7. 비용 관리

배포/제출 완료 후:

VM 중지 → 상태가 Stopped (deallocated)인지 확인
PostgreSQL 중지 → 상태가 Stopped인지 확인

최종 제출 완료 후 비용을 완전히 정리하려면:

rg-sourcewiki-student 리소스 그룹 삭제
12. Next Steps for Codex
레포지토리에서 Azure 배포 관련 파일 점검
cd /Users/yohan.choi/Documents/projects/SourceWiki

ls -la
ls -la .github/workflows
ls -la infra

sed -n '1,220p' compose.production.yaml
sed -n '1,220p' compose.azure.yaml
sed -n '1,220p' infra/Caddyfile.production
sed -n '1,260p' .github/workflows/deploy.yml
GHCR image path 실제 repo 기준으로 정합성 확인
.env.production.example과 실제 VM .env.production template 차이 확인
GitHub Actions secrets 등록 안내 생성
VM에 /opt/sourcewiki/.env.production 작성 절차 안내
GitHub Actions deploy 실행
배포 실패 시 logs 기반 수정
smoke test 완료 후 제출 URL 기록
13. Submission Format
GitHub Repository:
Web Service: https://sourcewiki.eastasia.cloudapp.azure.com/
Swagger UI: https://sourcewiki.eastasia.cloudapp.azure.com/api/docs/
OpenAPI JSON: https://sourcewiki.eastasia.cloudapp.azure.com/api/openapi.json