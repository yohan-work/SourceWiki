# 03. Caddy와 GitHub Actions CI

## Caddy란?

Caddy는 웹 요청을 받아서 적절한 서버로 넘겨주는 앞단 웹서버입니다.

이 프로젝트에서는 Caddy를 reverse proxy로 사용합니다.

처음에는 이렇게 이해하면 됩니다.

```text
Caddy = 사용자 요청을 받아서 web 또는 api로 안내하는 앞문
```

전체 Docker 실행 시 구조는 다음과 같습니다.

```text
사용자
  ↓
http://localhost:8080
  ↓
Caddy
  ├─ /api/* 요청 → api:4000
  └─ 나머지 요청 → web:3000
```

## 왜 Caddy를 쓰는가?

Docker 안에는 여러 서비스가 있습니다.

```text
web: 3000
api: 4000
db: 5432
mailpit: 1025, 8025
caddy: 80
```

사용자가 매번 web과 api 주소를 따로 기억하면 불편합니다.

```text
화면은 localhost:3000
API는 localhost:4000
```

Caddy를 앞에 두면 사용자는 하나의 주소만 기억하면 됩니다.

```text
http://localhost:8080
```

그리고 Caddy가 요청을 나눠줍니다.

## Caddyfile 읽기

현재 Caddy 설정은 `infra/Caddyfile`에 있습니다.

```caddy
:80 {
	encode zstd gzip

	handle /api/* {
		reverse_proxy api:4000
	}

	handle {
		reverse_proxy web:3000
	}
}
```

하나씩 풀면 다음과 같습니다.

```text
:80
  Caddy 컨테이너 안에서 80번 포트로 요청을 받는다

encode zstd gzip
  응답을 압축해서 보낼 수 있게 한다

handle /api/*
  /api/로 시작하는 요청만 처리한다

reverse_proxy api:4000
  해당 요청을 api 컨테이너의 4000번 포트로 넘긴다

handle
  위 조건에 걸리지 않은 나머지 요청을 처리한다

reverse_proxy web:3000
  나머지 요청을 web 컨테이너의 3000번 포트로 넘긴다
```

## api:4000과 web:3000은 어디 주소인가?

`api:4000`, `web:3000`은 내 Mac의 주소가 아니라 Docker Compose 내부 네트워크 주소입니다.

Docker Compose 안에서는 서비스 이름으로 서로를 찾을 수 있습니다.

```yaml
services:
  api:
    ...

  web:
    ...

  caddy:
    ...
```

그래서 Caddy 컨테이너는 `api`라는 이름으로 API 컨테이너를 찾고, `web`이라는 이름으로 web 컨테이너를 찾습니다.

## compose.yaml에서 Caddy 포트

`compose.yaml`에는 Caddy 포트가 이렇게 연결되어 있습니다.

```yaml
caddy:
  ports:
    - '${APP_PORT:-8080}:80'
```

뜻은 다음과 같습니다.

```text
내 Mac의 8080 포트
  ↓
Caddy 컨테이너 안의 80 포트
```

그래서 사용자는 다음 주소로 접속합니다.

```text
http://localhost:8080
```

## GitHub Actions CI란?

CI는 Continuous Integration의 약자입니다. 한국어로는 지속적 통합이라고 부릅니다.

쉽게 말하면 다음과 같습니다.

```text
코드를 GitHub에 올렸을 때
자동으로 설치, 검사, 테스트, 빌드를 돌려서
문제가 있는지 확인하는 과정
```

현재 `.github/workflows/ci.yml`은 다음 상황에서 실행됩니다.

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

뜻은 다음과 같습니다.

- PR을 만들거나 업데이트하면 실행됩니다.
- `main` 브랜치에 push하면 실행됩니다.
- 일반 브랜치에 push만 하는 경우에는 이 설정 기준으로 실행되지 않습니다.

## 현재 CI job 1: quality

첫 번째 job은 `quality`입니다.

이 job은 Node.js와 pnpm 환경에서 프로젝트 품질을 확인합니다.

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm lint
- run: pnpm typecheck
- run: pnpm test
- run: pnpm build
- run: pnpm format:check
```

각 명령의 의미는 다음과 같습니다.

- `pnpm install --frozen-lockfile`: lockfile과 실제 의존성이 맞는지 확인하며 설치합니다.
- `pnpm lint`: 코드 스타일과 규칙 위반을 확인합니다.
- `pnpm typecheck`: TypeScript 타입 오류를 확인합니다.
- `pnpm test`: 테스트를 실행합니다.
- `pnpm build`: 실제 빌드가 되는지 확인합니다.
- `pnpm format:check`: 포맷이 맞는지 확인합니다.

이 job에서는 PostgreSQL도 GitHub Actions 내부 서비스로 실행합니다.

```yaml
services:
  postgres:
    image: postgres:17-alpine
```

즉, 로컬 Docker가 아니라 GitHub Actions runner 안에서 테스트용 PostgreSQL이 뜹니다.

## 현재 CI job 2: compose-smoke

두 번째 job은 `compose-smoke`입니다.

이 job은 Docker Compose 설정이 실제로 빌드되고 실행되는지 확인합니다.

```yaml
- name: Validate Compose configuration
  run: docker compose config --quiet

- name: Build and start stack
  run: docker compose up --build --wait --wait-timeout 180
```

그 다음 Caddy를 통해 web과 api가 잘 연결되는지 확인합니다.

```yaml
curl --fail --retry 5 --retry-delay 2 http://localhost:8080/
curl --fail http://localhost:8080/api/health/live
curl --fail http://localhost:8080/api/health/ready
```

뜻은 다음과 같습니다.

```text
http://localhost:8080/
  Caddy → web으로 연결되는지 확인

http://localhost:8080/api/health/live
  Caddy → api로 연결되는지 확인

http://localhost:8080/api/health/ready
  api가 DB까지 연결 가능한지 확인
```

## CI와 Docker의 관계

GitHub Actions에서 Docker Compose를 실행한다고 해서 내 Mac의 Docker가 바뀌는 것은 아닙니다.

CI에서 Docker를 실행하는 위치는 GitHub Actions runner입니다.

```text
내 Mac
  영향 없음

GitHub Actions runner
  docker compose up --build 실행
  curl로 서비스 확인
  docker compose down --volumes 실행
```

따라서 현재 CI는 배포가 아니라 검증입니다.

현재 설정이 하는 일:

- 코드를 설치할 수 있는지 확인합니다.
- lint, typecheck, test, build, format을 확인합니다.
- Docker Compose 설정이 유효한지 확인합니다.
- Docker로 전체 스택이 실행되는지 확인합니다.
- Caddy를 통해 web/api 라우팅이 되는지 확인합니다.

현재 설정이 하지 않는 일:

- 서버에 자동 배포하지 않습니다.
- Docker 이미지를 registry에 push하지 않습니다.
- 내 로컬 Docker 컨테이너를 변경하지 않습니다.

## 기억할 것

- Caddy는 `localhost:8080` 하나로 web과 api를 연결해 주는 앞문입니다.
- `/api/*` 요청은 API로, 나머지는 web으로 갑니다.
- GitHub Actions CI는 push/PR 때 자동 검증을 합니다.
- 현재 CI는 배포가 아니라 검사입니다.
- CI에서 Docker를 실행해도 내 Mac의 Docker에는 영향이 없습니다.
