# 01. 모노레포와 pnpm

## 모노레포란?

모노레포는 여러 프로젝트를 하나의 Git 저장소 안에서 같이 관리하는 방식입니다.

일반적인 단일 프로젝트는 보통 이렇게 생겼습니다.

```text
my-app
├─ package.json
└─ src
```

SourceWiki는 이렇게 나뉘어 있습니다.

```text
SourceWiki
├─ apps
│  ├─ web
│  └─ api
├─ packages
│  └─ shared
└─ package.json
```

각 폴더의 역할은 다음과 같습니다.

- `apps/web`: 사용자가 보는 Next.js 화면입니다.
- `apps/api`: 데이터 처리와 API 응답을 담당하는 Express 서버입니다.
- `packages/shared`: web과 api가 같이 쓰는 타입, 스키마, 공통 코드입니다.

즉, SourceWiki는 프론트엔드와 백엔드가 따로 있지만 하나의 저장소에서 같이 움직입니다.

## 왜 모노레포를 쓰는가?

프론트엔드와 백엔드가 따로 있어도 서로 강하게 연결되어 있기 때문입니다.

예를 들어 API 응답 타입이 바뀌면 web도 그 타입을 알아야 합니다. 이때 `packages/shared`에 공통 타입을 두면 web과 api가 같은 기준을 사용할 수 있습니다.

```text
packages/shared
  ↓
apps/api 에서 사용
apps/web 에서도 사용
```

장점은 다음과 같습니다.

- 프론트엔드와 백엔드 코드를 한 번에 확인할 수 있습니다.
- 공통 타입을 중복 작성하지 않아도 됩니다.
- 한 번의 CI에서 전체 프로젝트를 같이 검증할 수 있습니다.
- 기능 변경 시 관련 코드를 같은 PR에서 함께 수정할 수 있습니다.

## pnpm이란?

`pnpm`은 `npm`과 같은 Node.js 패키지 매니저입니다.

역할은 비슷합니다.

```bash
npm install
npm run dev
```

대신 이 프로젝트에서는 이렇게 사용합니다.

```bash
pnpm install
pnpm dev
```

## 왜 npm 대신 pnpm인가?

이 프로젝트는 모노레포이기 때문에 여러 패키지를 한 번에 관리해야 합니다.

`pnpm-workspace.yaml`은 pnpm에게 어떤 폴더들을 하나의 작업공간으로 볼지 알려주는 파일입니다.

```yaml
packages:
  - apps/*
  - packages/*
```

뜻은 다음과 같습니다.

```text
apps 폴더 안의 패키지들
packages 폴더 안의 패키지들
전부 하나의 workspace로 묶어줘
```

그래서 루트 `package.json`에서 `@sourcewiki/api`, `@sourcewiki/web`, `@sourcewiki/shared`를 선택적으로 실행할 수 있습니다.

## pnpm dev는 실제로 무엇을 하는가?

루트 `package.json`에는 이런 스크립트가 있습니다.

```json
{
  "predev": "pnpm --filter @sourcewiki/shared build",
  "dev": "pnpm --parallel --filter @sourcewiki/api --filter @sourcewiki/web dev"
}
```

`pnpm dev`를 실행하면 먼저 `predev`가 자동으로 실행됩니다.

```text
1. packages/shared를 먼저 빌드
2. apps/api dev 실행
3. apps/web dev 실행
```

`--filter`는 특정 패키지만 고르는 옵션입니다.

```bash
pnpm --filter @sourcewiki/api dev
```

뜻은 다음과 같습니다.

```text
전체 workspace 중에서 @sourcewiki/api 패키지의 dev 명령만 실행해줘
```

`--parallel`은 여러 명령을 동시에 실행하라는 뜻입니다.

```text
api dev 서버 실행
web dev 서버 실행
둘 다 동시에 유지
```

## 예전 npm run dev와의 차이

예전 방식은 보통 앱 하나를 실행하는 느낌입니다.

```text
npm run dev
  ↓
Node 앱 하나 실행
```

지금 방식은 여러 패키지를 같이 실행합니다.

```text
pnpm dev
  ↓
shared 빌드
  ↓
api 실행 + web 실행
```

그래서 `pnpm dev`는 단순히 명령 이름만 다른 것이 아니라, 모노레포 전체 개발 환경을 켜는 명령입니다.

## 기억할 것

- `pnpm`은 Node 패키지 매니저입니다.
- `pnpm-workspace.yaml`은 모노레포 패키지 위치를 알려줍니다.
- `packages/shared`는 web과 api가 같이 쓰는 공통 코드입니다.
- `pnpm dev`는 web과 api를 동시에 실행합니다.
- DB와 개발용 메일 서버는 `pnpm dev`가 아니라 `pnpm dev:infra`로 Docker에서 따로 실행합니다.
