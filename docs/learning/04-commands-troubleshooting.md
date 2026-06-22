# 04. 자주 쓰는 명령어와 문제 해결

## 처음 세팅

Node와 pnpm 버전을 맞춥니다.

```bash
corepack enable
corepack prepare pnpm@10.34.0 --activate
pnpm install
```

`.env` 파일이 없다면 예시 파일을 복사합니다.

```bash
cp .env.example .env
```

## 로컬 개발 실행

개발할 때 가장 자주 쓰는 방식입니다.

```bash
pnpm dev:infra
pnpm dev
```

각 명령의 의미는 다음과 같습니다.

```text
pnpm dev:infra
  Docker로 PostgreSQL db만 실행

pnpm dev
  Node.js로 api와 web을 동시에 실행
```

접속 주소는 다음과 같습니다.

```text
Web:       http://localhost:3000
API live:  http://localhost:4000/api/health/live
API ready: http://localhost:4000/api/health/ready
DB:        localhost:5432
```

주의할 점은 `localhost:5432`는 브라우저 주소가 아니라 DB 접속 주소입니다.

## 전체 Docker 실행

운영에 더 가까운 형태로 전체 스택을 Docker에서 실행할 때 사용합니다.

```bash
pnpm docker:up
```

실행되는 서비스는 다음과 같습니다.

```text
mailpit
db
api
web
caddy
```

접속 주소는 다음과 같습니다.

```text
App:        http://localhost:8080
API live:   http://localhost:8080/api/health/live
API ready:  http://localhost:8080/api/health/ready
Mailpit UI: http://localhost:8025
```

종료할 때는 다음 명령을 사용합니다.

```bash
pnpm docker:down
```

## Docker 상태 확인

전체 서비스 상태를 확인합니다.

```bash
docker compose ps
```

DB만 확인합니다.

```bash
docker compose ps db
```

정상이라면 대략 이런 상태가 보여야 합니다.

```text
STATUS: Up ... (healthy)
PORTS:  0.0.0.0:5432->5432/tcp
```

의미는 다음과 같습니다.

```text
Up
  컨테이너가 실행 중

healthy
  healthcheck를 통과해서 정상 상태

0.0.0.0:5432->5432/tcp
  내 Mac의 5432 포트가 컨테이너 안 5432 포트로 연결됨
```

## PostgreSQL 접속 확인

내 컴퓨터에 `psql`이 설치되어 있다면 다음처럼 접속합니다.

```bash
psql "postgresql://sourcewiki:sourcewiki_local@localhost:5432/sourcewiki"
```

내 컴퓨터에 `psql`이 없어도 Docker 컨테이너 안의 `psql`로 접속할 수 있습니다.

```bash
docker compose exec db psql -U sourcewiki -d sourcewiki
```

접속 후 기본 명령은 다음과 같습니다.

```sql
\dt
```

테이블 목록을 봅니다.

```sql
\q
```

`psql`을 종료합니다.

## API 상태 확인

API 프로세스가 살아 있는지 확인합니다.

```bash
curl http://localhost:4000/api/health/live
```

API가 DB까지 연결 가능한지 확인합니다.

```bash
curl http://localhost:4000/api/health/ready
```

전체 Docker 실행 중에는 Caddy를 통해 확인합니다.

```bash
curl http://localhost:8080/api/health/live
curl http://localhost:8080/api/health/ready
```

## 자주 헷갈리는 상황

### 브라우저에서 localhost:5432가 안 보인다

정상입니다.

`localhost:5432`는 PostgreSQL 접속 포트입니다. 웹 브라우저가 아니라 `psql`, TablePlus, DBeaver, DataGrip 같은 DB 클라이언트로 접속해야 합니다.

### pnpm dev를 했는데 DB 연결이 안 된다

먼저 DB 컨테이너가 떠 있는지 확인합니다.

```bash
docker compose ps db
```

DB가 안 떠 있다면 먼저 실행합니다.

```bash
pnpm dev:infra
```

### 5432 포트 충돌이 난다

이미 내 Mac에 직접 설치된 PostgreSQL이 5432를 쓰고 있을 수 있습니다.

확인 방법:

```bash
lsof -i :5432
```

해결 방향은 둘 중 하나입니다.

- 기존 PostgreSQL을 끕니다.
- `.env`에서 `POSTGRES_PORT`를 다른 값으로 바꿔 Docker DB를 다른 포트로 노출합니다.

예를 들어:

```env
POSTGRES_PORT=5433
DATABASE_URL=postgresql://sourcewiki:sourcewiki_local@localhost:5433/sourcewiki?schema=public
```

### 전체 Docker 실행과 로컬 개발 실행이 헷갈린다

로컬 개발:

```text
Docker: db
Node:   web, api
주소:   localhost:3000, localhost:4000
```

전체 Docker 실행:

```text
Docker: mailpit, db, api, web, caddy
주소:   localhost:8080
```

## 검증 명령

CI에서 실행하는 주요 검증을 로컬에서도 실행할 수 있습니다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config --quiet
```

각 명령의 의미는 다음과 같습니다.

- `pnpm lint`: 코드 규칙 검사
- `pnpm typecheck`: TypeScript 타입 검사
- `pnpm test`: 테스트 실행
- `pnpm build`: 빌드 가능 여부 확인
- `pnpm format:check`: 포맷 확인
- `docker compose config --quiet`: Docker Compose 설정 문법 확인

## 문제를 볼 때 순서

문제가 생기면 보통 이 순서로 보면 됩니다.

```text
1. 어떤 실행 방식인가?
   로컬 개발인가, 전체 Docker인가?

2. 컨테이너가 떠 있는가?
   docker compose ps

3. DB가 healthy인가?
   docker compose ps db

4. API live가 되는가?
   /api/health/live

5. API ready가 되는가?
   /api/health/ready

6. Caddy를 통과하는 문제인가?
   localhost:8080과 직접 api 주소를 비교
```

## 기억할 것

- `pnpm dev:infra`는 DB만 Docker로 실행합니다.
- `pnpm dev`는 web과 api를 로컬 Node.js로 실행합니다.
- `pnpm docker:up`은 전체 서비스를 Docker로 실행합니다.
- `localhost:5432`는 DB 클라이언트로 확인해야 합니다.
- `localhost:8080`은 Caddy를 통해 web/api를 보는 주소입니다.
