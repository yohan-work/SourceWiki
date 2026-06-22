# 02. Docker, PostgreSQL, Docker Compose

## Docker란?

Docker는 프로그램을 내 컴퓨터에 직접 설치하지 않고, 격리된 실행 공간 안에서 실행하게 해주는 도구입니다.

처음에는 이렇게 이해하면 됩니다.

```text
Docker = 프로그램을 담아 실행하는 상자
```

예를 들어 PostgreSQL을 쓰려면 원래는 내 Mac에 직접 설치해야 합니다.

```text
내 Mac
└─ PostgreSQL 직접 설치
```

Docker를 쓰면 이렇게 됩니다.

```text
내 Mac
└─ Docker
   └─ PostgreSQL 컨테이너
```

장점은 다음과 같습니다.

- 내 Mac에 PostgreSQL을 직접 설치하지 않아도 됩니다.
- 팀원 모두 같은 PostgreSQL 버전을 사용할 수 있습니다.
- 프로젝트별로 DB 환경을 분리할 수 있습니다.
- CI에서도 로컬과 비슷한 환경으로 테스트할 수 있습니다.

## 이미지와 컨테이너

Docker에서 자주 나오는 단어는 `image`와 `container`입니다.

비유하면 다음과 같습니다.

```text
image     = 앱 설치 파일 또는 실행 템플릿
container = image를 실제로 실행한 상태
```

현재 PostgreSQL 설정은 다음과 같습니다.

```yaml
db:
  image: postgres:17-alpine
```

뜻은 다음과 같습니다.

```text
postgres:17-alpine 이미지를 사용해서 db 컨테이너를 실행한다
```

## PostgreSQL을 Docker에서 돌린다는 뜻

`pnpm dev:infra`를 실행하면 이 명령이 실행됩니다.

```bash
docker compose up -d db
```

뜻은 다음과 같습니다.

```text
compose.yaml에 정의된 서비스 중 db만 백그라운드로 실행해줘
```

여기서 `db`가 PostgreSQL입니다.

개발 중 구조는 다음과 같습니다.

```text
내 Mac
├─ Node.js
│  ├─ web: localhost:3000
│  └─ api: localhost:4000
└─ Docker
   └─ db: PostgreSQL, localhost:5432
```

즉, web과 api는 내 컴퓨터의 Node.js에서 실행되고, PostgreSQL만 Docker 컨테이너 안에서 실행됩니다.

## localhost:5432는 무엇인가?

`compose.yaml`에는 이런 설정이 있습니다.

```yaml
ports:
  - '${POSTGRES_PORT:-5432}:5432'
```

뜻은 다음과 같습니다.

```text
내 Mac의 5432 포트
  ↓
Docker 컨테이너 안 PostgreSQL의 5432 포트
```

그래서 API는 다음 주소로 DB에 접속할 수 있습니다.

```env
DATABASE_URL=postgresql://sourcewiki:sourcewiki_local@localhost:5432/sourcewiki?schema=public
```

풀어서 보면 다음과 같습니다.

```text
사용자: sourcewiki
비밀번호: sourcewiki_local
주소: localhost
포트: 5432
DB 이름: sourcewiki
```

중요한 점은 `localhost:5432`는 브라우저로 여는 주소가 아니라는 것입니다. PostgreSQL은 웹사이트가 아니라 데이터베이스 서버입니다.

확인은 `psql` 또는 DB 클라이언트로 해야 합니다.

```bash
psql "postgresql://sourcewiki:sourcewiki_local@localhost:5432/sourcewiki"
```

또는 Docker 컨테이너 안의 `psql`로 접속할 수 있습니다.

```bash
docker compose exec db psql -U sourcewiki -d sourcewiki
```

## DB 데이터는 어디에 저장되는가?

`compose.yaml`에는 volume 설정이 있습니다.

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

컨테이너는 껐다 켤 수 있는 실행 공간입니다. 컨테이너 안에만 데이터를 저장하면 컨테이너를 지울 때 데이터도 사라질 수 있습니다.

그래서 PostgreSQL 데이터는 `postgres_data`라는 Docker volume에 저장합니다.

```text
PostgreSQL 컨테이너
  ↓
postgres_data volume에 실제 DB 파일 저장
```

덕분에 `docker compose down`으로 컨테이너를 내려도 DB 데이터는 유지됩니다. 단, volume까지 삭제하면 데이터도 삭제됩니다.

## Docker Compose란?

Docker Compose는 여러 컨테이너를 한 번에 관리하는 도구입니다.

이 프로젝트를 전체 Docker로 실행하면 필요한 서비스가 하나가 아닙니다.

```text
mailpit  개발용 이메일 확인 도구
db       PostgreSQL
api      Express API
web      Next.js
caddy    앞단 reverse proxy
```

이런 서비스를 매번 긴 Docker 명령어로 하나씩 실행하면 복잡합니다. 그래서 `compose.yaml`에 실행 규칙을 적어둡니다.

```yaml
services:
  mailpit:
    image: axllent/mailpit:v1.27

  db:
    image: postgres:17-alpine

  api:
    build:
      dockerfile: apps/api/Dockerfile

  web:
    build:
      dockerfile: apps/web/Dockerfile

  caddy:
    image: caddy:2.10-alpine
```

그리고 다음 명령으로 전체 실행합니다.

```bash
pnpm docker:up
```

실제로는 이 명령입니다.

```bash
docker compose up --build
```

## depends_on과 healthcheck

`depends_on`은 서비스 실행 순서를 표현합니다.

예를 들어 API는 DB가 준비된 뒤 실행되어야 합니다.

```yaml
api:
  depends_on:
    db:
      condition: service_healthy
```

뜻은 다음과 같습니다.

```text
db가 healthy 상태가 된 뒤 api를 실행한다
```

`healthcheck`는 컨테이너가 실제로 정상인지 확인하는 규칙입니다.

PostgreSQL은 다음 명령으로 준비 상태를 확인합니다.

```yaml
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}']
```

컨테이너가 단순히 켜진 것과 실제로 요청을 받을 준비가 된 것은 다릅니다. `healthcheck`는 그 차이를 확인해 줍니다.

## 현재 자주 쓰는 실행 방식

개발할 때:

```bash
pnpm dev:infra
pnpm dev
```

이 방식은 DB만 Docker로 띄우고 web/api는 로컬 Node.js에서 실행합니다. 빠른 hot reload 개발에 좋습니다.

전체 Docker 환경을 확인할 때:

```bash
pnpm docker:up
```

이 방식은 `mailpit`, `db`, `api`, `web`, `caddy`를 모두 Docker로 실행합니다. 운영에 더 가까운 형태를 확인할 때 좋습니다.

## 기억할 것

- Docker는 프로그램을 격리된 컨테이너에서 실행합니다.
- PostgreSQL은 Docker 안에서 실행되지만, 내 Mac에서는 `localhost:5432`로 접속합니다.
- `localhost:5432`는 브라우저 주소가 아니라 DB 접속 포트입니다.
- Docker Compose는 여러 서비스를 한 번에 실행하는 설정입니다.
- `healthcheck`는 컨테이너가 실제로 준비됐는지 확인합니다.
- `volume`은 DB 데이터를 컨테이너 밖에 보관하기 위한 저장소입니다.
