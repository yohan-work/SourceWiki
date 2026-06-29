# 선택 기능 확장 계획 및 구현 상태

## 목표

`planning/plan-02.md`의 선택 기능은 검색, 좋아요, 사용자 프로필, 파일 업로드 순서로 확장한다. 현재 검색, 좋아요, 사용자 프로필은 구현되어 있으며, 파일 업로드는 별도 phase로 구현한다.

## 구현 상태

- 완료: 게시글 검색
  - `/api/sources`의 `q`, `tag`, `type` query와 서버 pagination.
  - `/sources` 화면 검색어, 태그, 유형 필터와 URL query 동기화.
- 완료: 좋아요
  - `SourceLike` 모델과 자료 좋아요 추가/취소 API.
  - 목록/상세의 `likeCount`, `likedByMe` 표시와 로그인 사용자 토글.
- 완료: 사용자 프로필
  - `User.bio`, 공개 프로필, 내 프로필 수정 API.
  - `/users/[id]`, `/profile`, 작성자 프로필 링크.
- 완료: 파일 업로드
  - 로컬/Docker volume 저장 방식.
  - 자료 작성자 업로드/삭제, 공개 목록/다운로드.
  - 허용 파일: pdf, txt, md, png, jpg, webp. 최대 크기: 10MB.

## 제외 범위

- 댓글 좋아요.
- 프로필 이미지 업로드.
- S3 같은 외부 object storage.
- 업로드 파일 본문 파싱, 바이러스 검사, 전문 검색 색인.

## 검증 기준

- shared schema build와 unit test 통과.
- API typecheck, OpenAPI validation, integration test 통과.
- Web typecheck와 component test 통과.
- Compose 실행 시 API upload volume이 유지된다.
