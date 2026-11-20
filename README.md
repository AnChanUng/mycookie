# 나의쿠키

CS 전공지식, 기술면접, 코딩테스트를 공부하고 학습 기록을 이어 가는 서비스입니다.

[서비스](https://mycookie.dev) · [만든 이유와 서비스 소개](https://mycookie.dev/intro) · [패치노트](https://mycookie.dev/changelog)

## 개발

React 19 · Spring Boot 3.5 / Java 17 · PostgreSQL 18 · Redis · Kafka

홈서버에서 Docker Compose와 nginx로 실행하고 Cloudflare Tunnel로 연결합니다.
작업 브랜치는 최신 dev에서 만들고, dev에서 스테이징 검증 후 master로 운영 배포합니다.

## 로컬 실행

Node.js 24와 JDK 17~21, PostgreSQL이 필요합니다.
DB 연결 환경변수를 설정한 뒤 각각의 터미널에서 실행합니다.

~~~bash
cd backend
./gradlew bootRun
~~~

~~~bash
cd frontend
npm ci
VITE_API_URL=http://localhost:8080/api/v1 npm run dev
~~~

## 개발 문서

- [작업 규칙](CLAUDE.md)
- [홈서버와 환경 설정](docs/homeserver.md) · [환경변수 예시](deploy/homeserver/.env.example)
- [모니터링 운영 안내](docs/monitoring.md) · [모니터링 구조 학습 글](docs/blog/2026-11-monitoring/post.md)

## 검증

~~~bash
cd backend
./gradlew test
~~~

~~~bash
cd frontend
npm run lint
npm run build
~~~
