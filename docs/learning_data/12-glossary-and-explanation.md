# 12. 용어와 발표 연습

## 먼저 생각해 보기

이 프로젝트를 1분 안에 설명한다면, 기술 이름을 나열하지 않고 어떤 순서로 말해야 할까?

## 1분 설명 예시

“SourceWiki는 사용자가 웹 자료를 저장하고 태그·댓글·파일을 관리하는 서비스입니다. Next.js 화면이 Express API에 요청하고, API는 Prisma를 통해 PostgreSQL에 데이터를 저장합니다. 회원가입은 SMTP 이메일 인증을 거치고, 로그인은 짧은 access token과 회전형 refresh token 쿠키로 유지합니다. 로컬과 CI는 Docker Compose로 DB와 Mailpit을 재현하며, 운영은 GitHub Actions가 GHCR 이미지를 Azure VM에 배포하고 Caddy가 HTTPS와 API 프록시를 담당합니다.”

## 핵심 용어

| 용어 | 쉬운 뜻 | SourceWiki의 예 |
| --- | --- | --- |
| frontend | 사용자가 보는 프로그램 | Next.js 화면 |
| backend | 규칙과 데이터를 처리하는 서버 | Express API |
| API | 프로그램끼리 대화하는 약속 | `/api/auth/login` |
| DB | 오래 보관되는 데이터 | PostgreSQL `users`, `sources` |
| ORM | 코드와 DB를 연결하는 도구 | Prisma |
| migration | DB 구조 변경 이력 | Prisma migrations |
| cookie | 브라우저가 보관하는 작은 상태 값 | access/refresh token |
| reverse proxy | 요청을 내부 서비스로 전달 | Caddy |
| container | 격리된 실행 단위 | api, web, db |
| CI/CD | 검사와 배포 자동화 | GitHub Actions |

## 이해 점검

**Q. “Docker를 썼다”는 설명만으로 충분하지 않은 이유는?**  
**A.** 어떤 서비스가 컨테이너에 있고, 네트워크·볼륨·health check가 어떻게 연결되는지까지 말해야 실제 구조를 설명할 수 있다.

## 흔한 오해

많은 기술을 썼다는 사실보다, 각 기술이 어떤 문제를 해결하고 다음 단계에 무엇을 넘기는지 설명하는 것이 더 중요하다.

## 다음 학습 방향

AI는 현재 demo 모드이며, 실제 모델 연동은 VM 자원·Docker 네트워크·응답 시간과 함께 별도 설계가 필요하다. 먼저 이 교재의 Web→API→DB→배포 흐름을 설명할 수 있게 된 뒤 확장한다.
