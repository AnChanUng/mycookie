<div align="center">

# 나의쿠키

### 신입 개발자 취업 준비를 한 곳에서

CS 전공지식, 기술면접, 코딩테스트, 실전 대결, 학습 기록을 하나로 잇는 학습 서비스입니다.

[사이트](https://mycookie.dev) | [패치노트](https://mycookie.dev/changelog) | [기술 블로그](https://cookie.tistory.com/258)

![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.5-6DB33F?logo=springboot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_18-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7.4-FF4438?logo=redis&logoColor=white)
![Kafka](https://img.shields.io/badge/Kafka_3.9-231F20?logo=apachekafka&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?logo=docker&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare_Tunnel-F38020?logo=cloudflare&logoColor=white)
![CI](https://github.com/AnChanUng/mycookie/actions/workflows/ci.yml/badge.svg)

</div>

## 프로젝트 배경

신입 개발자 취업 준비는 흩어져 있습니다. CS 개념은 블로그에서, 면접 질문은 정리 노트에서, 코딩테스트는 또 다른 사이트에서 따로 공부하고, 무엇을 얼마나 했는지는 남지 않습니다.

### Problem

- 전공지식, 기술면접, 코딩테스트 자료가 여러 곳에 흩어져 있다.
- 혼자 공부하면 꾸준히 이어 가기 어렵고, 실력이 늘었는지 확인하기 어렵다.
- 틀린 문제와 약한 과목이 기록으로 남지 않는다.

### Solution

> 취업 준비에 필요한 공부를 한 사이트에서, 기록이 쌓이고 겨루면서 이어 가게 만들자.

- **한 곳에서 공부:** 과목별 전공노트, 기술면접 질문과 꼬리질문, 웹 필수지식, 기업별 예상문제
- **겨루면서 공부:** 같은 문제를 동시에 푸는 1:1 대결과 단체전
- **기록으로 확인:** 오답노트, 북마크, 풀이 수에 따른 티어와 승급 시험, 기기 간 기록 동기화

## 주요 기능

| 영역 | 내용 |
| --- | --- |
| CS, 기술면접 | 과목별 전공노트, 기술면접 질문과 예시 답변, 꼬리질문, 웹 필수지식 문답 |
| 실전 | 1:1 대결, 단체전, 기업별 예상문제집, 주제별 통합 문제집 |
| 학습 기록 | 오답노트, 북마크, 계정 간 기록 동기화, 티어와 승급 시험, 오늘의 CS |
| 커뮤니티 | 실시간 채팅, 친구 신청과 1:1 대화 |
| 알림 | 매일 CS 문제를 Mattermost와 메일로 받기, 건의와 버그 제보는 GitHub 이슈와 Mattermost 알림으로 |

## 기술 스택

| 영역 | 구성 |
| --- | --- |
| 화면 | React 19, React Router 7, Vite |
| API | Java 17, Spring Boot 3.5, Spring Data JPA, 소셜 로그인 OAuth 2.0(Google, Kakao, Naver, GitHub) |
| 데이터 | PostgreSQL 18, Redis 7.4(접속자 수, 요청 제한), 테스트 H2와 Testcontainers |
| 메시징, 실시간 | Kafka 3.9(제보 이벤트, 재시도와 DLT), SSE(채팅, 승급 알림) |
| 인프라 | 홈서버(WSL2 Ubuntu 24.04), Docker Compose, nginx, Cloudflare Tunnel, Tailscale |
| 운영 | GitHub Actions CI, systemd 자동 배포, gpg와 rclone 암호화 백업 |
| 테스트 | JUnit 5, Testcontainers(PostgreSQL, Redis, Kafka), k6 부하 테스트 |

## 인프라 구조도

![나의쿠키 인프라 구조도](docs/architecture/architecture.png)

- 노트북 한 대(**홈서버**, 메모리 8GB)에서 화면(nginx), 백엔드, PostgreSQL, Redis, Kafka를 Docker Compose로 운영과 스테이징을 함께 돌립니다(메모리 한도 합계 약 3.4GB).
- 공유기 포트를 열지 않고 **Cloudflare Tunnel**로 외부 요청을 받습니다. 도메인, HTTPS 인증서, 방화벽도 Cloudflare가 맡습니다.
- 화면과 API를 같은 주소에서 nginx가 나눠 보내서 CORS가 필요 없습니다.
- **Redis:** 접속자 수, 채팅 참여자, IP별 요청 제한처럼 짧게 사는 상태를 둡니다. 백엔드를 다시 띄워도 남고, 여러 대로 늘려도 같은 값을 봅니다.
- **Kafka:** 건의, 버그 제보가 들어오면 이벤트만 넣고 바로 답합니다. 소비자가 GitHub 이슈를 만들고 Mattermost로 알리며, 실패하면 다시 시도한 뒤 DLT에 남깁니다.
- Redis나 Kafka가 멈춰도 사이트는 멈추지 않도록 메모리 값과 바로 처리로 대신합니다.
- **자동 배포:** 5분마다 `master`, `dev`를 확인해 바뀐 쪽(화면 또는 백엔드)만 다시 빌드합니다.
- **백업:** 매일 04:00 DB를 덤프해 홈서버에 보관하고, gpg(AES-256)로 암호화해 Google Drive에도 올립니다(3-2-1 원칙).

구축 과정은 [홈서버 구축하기: 서버 구축부터 DB 마이그레이션까지](https://cookie.tistory.com/258)에 정리했습니다. 그림은 `docs/architecture/build.py`로 다시 만들 수 있습니다.

## 핵심 기술 이야기

| 주제 | 내용 |
| --- | --- |
| [클라우드에서 홈서버로](docs/homeserver.md) | Vercel, Render, Neon에서 노트북 홈서버로 옮긴 과정(DB 이전, 터널 전환, 백업) |
| [대결 동시성](docs/duel-concurrency.md) | 두 사람이 동시에 답을 낼 때 점수가 꼬이지 않게 처리 |
| [커넥션 풀](docs/hikaricp-pool.md) | 부하 테스트로 HikariCP 풀 크기 정하기 |
| [보안 설계](docs/security.md) | 비밀번호 재설정 메일 인증, 요청 제한, 크롤링 대응, 보안 헤더 |
| [검색 노출](docs/seo.md) | SPA를 미리 렌더링해 검색엔진에 노출 |

## 개발 흐름

1. 작업마다 GitHub 이슈를 한글로 등록합니다(기능, 버그 템플릿).
2. `feature/*`, `fix/*` 브랜치에서 작업하고, 이슈를 연결한 PR을 `dev`로 올립니다.
3. PR마다 **GitHub Actions**가 백엔드 테스트, 화면 린트와 빌드, 데이터 검사를 실행합니다.
4. `dev`에 병합되면 스테이징(staging.mycookie.dev)에 자동 배포되어 확인합니다.
5. `dev` → `master` PR로 운영에 배포하고, 바뀐 내용은 [패치노트](https://mycookie.dev/changelog)와 GitHub Release(`vX.Y.Z` 태그)에 기록합니다.

## 로컬에서 실행하기

Node.js 24와 **JDK 17~21**이 필요합니다(Gradle 8.7은 JDK 25에서 실행되지 않습니다).

```bash
cd backend
JDBC_DATABASE_URL=jdbc:postgresql://localhost:5432/cs_study ./gradlew bootRun
```

```bash
cd frontend
npm ci
VITE_API_URL=http://localhost:8080/api/v1 npm run dev
```

| 환경변수 | 용도 |
| --- | --- |
| `JDBC_DATABASE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | PostgreSQL 연결 |
| `ADMIN_KEY` | 32자 이상의 관리자 키. 없으면 관리자 API가 닫힙니다. |
| `VITE_API_URL` | 개발 서버에서 쓸 API 주소 |

운영 환경변수 전체는 [deploy/homeserver/.env.example](deploy/homeserver/.env.example)에 있습니다.

## 검증하기

```bash
cd backend && ./gradlew test                 # Docker가 있으면 Testcontainers 테스트도 실행
cd frontend && npm run lint && npm run build
```
