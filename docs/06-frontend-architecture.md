# 프론트엔드 아키텍처

## 기술과 책임 분리

Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, Zustand를 사용한다. Next.js는 화면과 공개 페이지의 서버 렌더링을 담당하고 Express가 유일한 비즈니스 API다. 프론트에 별도 DB 접근이나 중복 비즈니스 로직을 만들지 않는다.

- Server Component: 공개 목록·상세의 초기 데이터, metadata, 정적 layout
- Client Component: 폼, 댓글 mutation, pagination interaction, AI 요청·검토처럼 상호작용이 필요한 최소 경계
- TanStack Query: 사용자, 자료, 댓글 등 서버 상태와 mutation
- Zustand: 작성 폼 임시 UI, dialog 등 여러 비인접 컴포넌트가 공유하는 작은 클라이언트 상태만 관리
- URL search params: 페이지 번호처럼 공유·새로고침되어야 하는 상태
- React local state: 단일 컴포넌트 입력·열림 상태

자료 목록·auth user를 Zustand에 복제하지 않는다. 서버 상태와 클라이언트 상태의 소유권을 분명히 해 stale data를 피한다.

## 권장 구조

```text
apps/web/src/
  app/                 # route, layout, loading, error
  features/auth/       # form, query, mutation
  features/sources/
  features/comments/
  features/ai/
  lib/api/             # fetch client, error, retry
  lib/query/           # QueryClient, keys
  stores/              # 최소 UI store
  components/ui/       # 재사용 UI primitive
packages/shared/       # API DTO/schema와 enum
```

barrel import를 남발하지 않고 무거운 editor·시각화가 추가되면 `next/dynamic`으로 해당 화면에서만 로드한다.

## API client

공통 `apiFetch<T>`는 base URL, JSON 직렬화, `credentials: include`, timeout signal, 공통 오류 parsing을 처리한다. 정상 응답은 타입 `T`, 실패는 `ApiError { status, code, message, fieldErrors, requestId }`를 throw한다.

401 처리 절차는 다음과 같다.

1. auth endpoint가 아닌 요청이 401이면 module 단위 single-flight refresh promise를 생성하거나 기존 promise를 기다린다.
2. refresh 성공 시 원 요청을 정확히 한 번 재시도한다.
3. refresh 실패 또는 재시도 401이면 auth query를 null로 만들고 로그인으로 이동한다.
4. login·refresh·logout 요청 자체는 자동 refresh 대상에서 제외한다.

여러 401이 동시에 발생해 refresh token이 연속 회전하지 않게 single-flight를 반드시 적용한다. mutation은 method와 body가 재사용 가능한 경우에만 재시도한다.

## 인증 상태와 페이지 보호

JWT는 HttpOnly 쿠키이므로 JavaScript에서 읽지 않는다. `useMeQuery`의 `/auth/me` 결과가 로그인 상태의 기준이다. 앱 시작 시 loading/authenticated/anonymous 세 상태를 사용해 hydration flicker를 막는다.

- 공개: 홈, 목록, 상세, 로그인, 가입, 인증 결과
- 보호: 자료 등록·수정
- 소유권: 상세 응답 `isOwner`로 UI를 숨기고 API가 최종 검증

Next middleware는 쿠키 존재 여부로 빠른 UX redirect만 할 수 있으며 인증의 신뢰 경계가 아니다. 보호 화면은 서버/API 결과로 다시 확인한다. 로그인 이동 시 `returnTo`는 `/`로 시작하는 allowlisted 내부 경로만 허용한다.

## Query 설계

```text
['auth', 'me']
['sources', { page, limit }]
['source', id]
['comments', sourceId]
```

- 공개 목록 staleTime 30초, 상세 60초, 댓글 15초, auth user 5분을 기본으로 한다.
- 자료 생성·수정·삭제 후 영향받는 목록과 상세 query를 invalidate한다.
- 댓글 mutation 후 댓글과 source commentCount query를 invalidate한다.
- 페이지 이동 전에 다음 페이지를 prefetch하되 네트워크 절약 설정에서는 생략한다.
- 독립적인 서버 fetch는 병렬 시작하고 순차 waterfall을 만들지 않는다.

Server Component가 가져온 초기 데이터는 필요한 최소 DTO만 Query hydration boundary에 전달한다. `rawText`를 목록 payload나 Client Component props로 직렬화하지 않는다.

## 폼과 오류 처리

React Hook Form과 공유 Zod schema를 사용한다. 클라이언트 검증은 UX용이고 서버 검증이 최종 기준이다. `fieldErrors`는 폼 field에 매핑하고 일반 오류는 form alert에 유지한다. 403·404·429·5xx는 code별 행동을 제공하며 toast만 띄우고 사라지게 하지 않는다.

AI 요약은 mutation local state로 관리한다. 결과는 source cache를 즉시 덮어쓰지 않고 review state에 두며 사용자가 적용할 때 PATCH한다. AI 요청 중에도 상세의 나머지 interaction은 가능하다.

## 성능·렌더링 원칙

- 공개 초기 데이터는 서버에서 가져오고 상호작용만 client boundary로 분리한다.
- 독립 fetch는 `Promise.all` 또는 병렬 component tree로 실행하고 Suspense boundary로 느린 영역을 격리한다.
- 목록에는 preview DTO만 사용하고 대형 원문은 상세에서 요청한다.
- 무거운 라이브러리는 route 단위 dynamic import, 패키지는 직접 import한다.
- derived state를 effect로 복사하지 않고 render 중 계산한다.
- 긴 목록은 우선 서버 pagination으로 제한하며 필요 시 `content-visibility`를 적용한다.
- Query Devtools는 개발 환경에서만 동적 로드한다.

## 프론트 테스트

- Vitest/Testing Library: 폼 validation, auth 상태, ApiError mapping, 소유권 버튼
- MSW: 401-refresh-retry single flight, 403, 422, 429, AI 실패
- Playwright: 가입·인증·로그인, 새로고침 유지, 자료·댓글 CRUD, 타인 권한, 페이징
- Lighthouse/axe: 주요 공개 화면의 성능·접근성 회귀
