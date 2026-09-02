# 17. Azure 배포와 운영

## 이 장에서 답할 수 있게 되는 것

- 내 코드가 어떻게 인터넷 서비스가 되는가
- 왜 서버에서 직접 빌드하지 않는가

## 먼저 짚고 갈 것 — 배포 대상의 이름

실제 배포 대상은 **Azure VM**이다. 다만 `.github/workflows/deploy.yml`의 접속 정보는 `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`라는 이름을 쓰고 배포 단계 이름도 "Deploy on EC2"다. **이름만 EC2이고 실제로 접속하는 서버는 Azure VM**이다. GitHub Actions 입장에서는 "SSH로 접속할 수 있는 리눅스 서버"일 뿐이라 이름이 무엇이든 동작에는 영향이 없다.

발표에서 이 부분을 물으면 이렇게 답한다. "배포 대상은 Azure VM이고, 워크플로의 시크릿 이름이 EC2로 남아 있는 것은 초기 작명이 그대로 남은 것입니다. 배포 방식은 SSH로 접속해 Docker Compose를 올리는 방식이라 클라우드 종류와 무관하게 동작합니다."

`compose.azure.yaml`은 이 환경에 맞춘 덧씌우기 설정이다. VM 안에서 PostgreSQL을 띄우는 대신 **VM 밖의 관리형 PostgreSQL을 쓰도록** 바꾼다. DB를 VM과 분리하면 VM을 다시 만들어도 데이터가 그대로 남고, 백업·확장을 클라우드가 맡는다.

## 먼저 생각해 보기

내 컴퓨터에서 만든 코드는 어떻게 Azure VM에서 HTTPS 서비스가 되고, DB는 왜 VM 밖 Azure PostgreSQL에 둘까?

## 핵심 해설

현재 운영 흐름은 GitHub Actions, GHCR, Azure VM, Azure PostgreSQL을 연결한다. 소스 코드를 VM에서 직접 빌드하는 대신 CI가 불변 이미지 태그를 만들고 VM은 해당 이미지를 실행한다.

```mermaid
flowchart LR
  G[main의 CI 성공] --> A[Deploy Actions]
  A --> R[GHCR: Web/API 이미지]
  A --> V[Azure VM]
  V --> C[Docker Compose]
  C --> W[Web]
  C --> P[API]
  P --> DB[(Azure PostgreSQL)]
  U[사용자] --> H[Caddy HTTPS]
  H --> W
  H --> P
```

| 운영 구성 | 역할 |
| --- | --- |
| GitHub Actions | 검사, 이미지 build/push, VM 배포 자동화 |
| GHCR | Git commit SHA가 붙은 Web/API 이미지 보관 |
| Azure VM | Caddy, Web, API 컨테이너 실행 |
| Azure PostgreSQL | 운영 영구 데이터 저장 |
| `.env.production` | DB, JWT, SMTP, 도메인 등 비밀 설정 |

배포 중 migration은 Azure PostgreSQL에 아직 적용되지 않은 테이블 구조만 적용한다. `No pending migrations`는 오류가 아니라 이미 최신 구조라는 뜻이다. 운영 DB는 seed 데이터가 없을 수 있다.

운영에서 실제 메일 인증은 Mailpit이 아니라 SMTP로 수신자의 받은편지함에 도착해야 한다. 환경변수의 비밀값은 Git·문서·스크린샷에 남기지 않는다.

## 이해 점검

**Q. VM에서 Compose 상태 확인에도 이미지 변수가 필요한 이유는?**  
**A.** 운영 Compose는 어떤 GHCR API/Web 이미지를 사용할지 환경변수로 받기 때문이다. 상태 확인도 Compose가 설정을 해석하는 과정이므로 그 값이 필요하다.

## 흔한 오해

Azure PostgreSQL에 DBeaver로 연결되는 것과 API가 같은 DB를 쓰는 것은 별개의 확인이다. API의 `DATABASE_URL`이 동일한 데이터베이스를 가리켜야 한다.

---

다음 장 → [18. 장애를 논리적으로 찾는 법](./18-troubleshooting-thinking.md)
