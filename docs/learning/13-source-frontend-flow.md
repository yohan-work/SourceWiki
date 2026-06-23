# 13. 자료·댓글 프론트엔드 흐름

## Phase 3 화면 구조

Phase 3에서 추가된 주요 화면은 다음과 같습니다.

```text
/sources              자료 목록
/sources/new          자료 등록
/sources/[id]         자료 상세와 댓글
/sources/[id]/edit    자료 수정
```

Next.js App Router의 route 파일은 화면의 server boundary를 담당하고, 실제 상호작용은 feature component로 분리합니다.

```text
apps/web/src/app/sources/
  route page와 loading/not-found

apps/web/src/features/sources/
  목록, 상세, form, API 호출

apps/web/src/features/comments/
  댓글 목록과 작성·수정·삭제
```

## Server Component에서 초기 데이터 가져오기

목록과 상세 page는 Server Component에서 API를 먼저 호출합니다.

```text
Server Component
  ↓ serverApiFetch
Express API
  ↓
TanStack Query cache에 초기 데이터 저장
  ↓
HydrationBoundary
  ↓
Client Component
```

이렇게 하면 첫 화면을 그릴 때 client가 빈 화면에서 다시 fetch하는 시간을 줄일 수 있습니다.

`serverApiFetch`는 browser의 `/api` rewrite를 거치지 않고 서버 내부 주소를 사용합니다.

```text
로컬 기본값: http://localhost:4000
Docker web container: http://api:4000
```

그래서 Docker 모드에서는 `API_INTERNAL_URL=http://api:4000`이 필요합니다.

## Client Component가 필요한 부분

다음 기능은 브라우저 interaction이 있으므로 Client Component입니다.

```text
페이지 이동 버튼
자료 등록·수정 form
삭제 confirm dialog
댓글 작성·수정·삭제
로그인 사용자 확인
```

form과 button이 필요한 작은 영역만 `'use client'`로 유지하면 전체 route를 client bundle로 만들지 않아도 됩니다.

## React Query key 설계

자료 기능은 목록, 상세, 댓글을 서로 다른 query key로 관리합니다.

```text
['sources', { page, limit }]
['source', id]
['comments', id]
```

댓글을 추가하거나 삭제하면 댓글 수와 상세 정보가 바뀔 수 있습니다. 그래서 mutation 성공 후 관련 query를 함께 무효화합니다.

```text
댓글 작성 성공
  ↓
comments(id) invalidate
source(id) invalidate
sources lists invalidate
```

## 권한 UI와 API 권한의 차이

상세 화면은 로그인 사용자와 작성자 ID를 비교해 수정·삭제 버튼을 보여줍니다.

```text
me.id === source.author.id
  ↓
수정·삭제 버튼 표시
```

하지만 이것은 사용자 경험을 위한 표시 조건입니다. 실제 보호는 API가 `userId` 조건으로 다시 검증합니다.

프론트엔드는 사용자가 할 수 없는 행동을 숨겨 혼란을 줄이고, API는 조작된 요청을 막습니다.

## 로그인 필요 화면 처리

`/sources/new`와 `/sources/[id]/edit`는 인증 사용자가 필요한 화면입니다. Client Component에서 `useMeQuery`로 로그인 상태를 확인하고, 비회원이면 로그인 화면으로 이동합니다.

```text
/sources/new 접근
  ↓
/auth/me 확인
  ↓
비회원이면 /login?returnTo=/sources/new
```

로그인 후 돌아올 수 있도록 `returnTo`를 사용하지만, 외부 URL로 이동하지 않도록 기존 인증 흐름의 내부 경로 제한을 그대로 사용합니다.

## Form validation

자료 form은 공유 schema를 바탕으로 필드를 검증합니다.

```text
title        필수, 200자 이하
originalUrl  공개 HTTP(S) URL
rawText      100,000자 이하
tags         쉼표 구분, 최대 10개
```

등록 화면에서는 URL, 제목, 본문, 태그, 개인 메모를 저장합니다. 요약, 핵심 포인트, 키워드는 수정 화면에서 편집할 수 있습니다.

댓글 form은 1자 이상 2,000자 이하입니다. 현재 댓글 수정 form은 validation 실패 시 저장을 막지만 별도 오류 메시지를 보여주지 않아 UX 보완 여지가 있습니다.

## 기억할 것

- Route page는 가능한 Server Component로 두고, 상호작용 영역만 Client Component로 분리합니다.
- server-side fetch는 `API_INTERNAL_URL` 같은 내부 API 주소가 필요합니다.
- mutation 후에는 영향을 받는 query key를 함께 invalidate합니다.
- 프론트의 작성자 버튼 표시와 API의 소유권 검증은 역할이 다릅니다.
- 보호 화면은 `useMeQuery`와 `returnTo`로 로그인 흐름에 연결합니다.
