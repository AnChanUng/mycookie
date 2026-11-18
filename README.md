<div align="center">

# DevCookie

### 신입 개발자 취업 준비를 한 곳에서

CS·기술면접, 코딩테스트, 실전 대결, 학습 기록을 하나로 잇는 학습 서비스입니다.<br>
지금은 **개발자 취업 준비 사이트로 리뉴얼 중**이며, 11월 말 다시 열 예정입니다.

[사이트](https://cs-study-platform.vercel.app/) | [패치노트](https://cs-study-platform.vercel.app/changelog) | [개발 문서](#개발-문서)

![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.5-6DB33F?logo=springboot&logoColor=white)
![Spring AI](https://img.shields.io/badge/Spring_AI_1.1-6DB33F)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6F00)

</div>

## 주요 기능

| 영역 | 내용 |
| --- | --- |
| CS · 기술면접 | 과목별 전공노트, 기술면접 질문 152개와 예시 답변 · 꼬리질문, 웹 필수지식 52문답 |
| 실전 | 같은 문제를 풀고 겨루는 1:1 대결 · 단체전, 기업별 예상문제집, 주제별 통합 문제집 |
| 학습 기록 | 오답노트 · 북마크, 계정 간 기록 동기화, 풀이 수에 따른 티어와 승급 시험, 오늘의 CS |
| 커뮤니티 | 실시간 채팅, 친구 신청과 1:1 대화 |
| AI 학습 도우미 (개발 중) | 학습 자료에 근거해서만 답하고, 근거가 없으면 답하지 않는 RAG |

## 최근 개선

| 주제 | 결과 | 문서 |
| --- | --- | --- |
| 실시간 대결 동시성 | 동시 재대결 100건에서 방 중복 9개 → 0개, 재대결 매칭률 23.6% → 100%, 점수 서버 채점 | [duel-concurrency](docs/duel-concurrency.md) |
| DB 커넥션 풀 병목 | 30명 동시 동기화에서 일반 조회 p95 976ms → 99ms, 커넥션 대기 160 → 16개 | [hikaricp-pool](docs/hikaricp-pool.md) |
| RAG 검색 정확도 | 1차 Top-K → Reranking → 2차 Top-K로 Hit@1 86.4% → 96.6%, 근거 없는 질문 응답 12% → 0% | [rag-assistant](docs/rag-assistant.md) |

모든 수치는 로컬 환경에서 수정 전후 코드를 같은 조건으로 비교한 측정값입니다. 측정 방법과 한계는 각 문서에 적었습니다.

## 기술 구성

| 영역 | 구성 |
| --- | --- |
| 화면 | React 19, React Router 7, Vite |
| API | Java 17, Spring Boot 3.5, Spring Data JPA, Spring AI 1.1 |
| 데이터 | PostgreSQL(운영 Neon), 테스트 H2 · Testcontainers |
| RAG | ChromaDB, bge-m3 임베딩, bge-reranker-v2-m3 재정렬(TEI), Gemini |
| 실시간 | SSE(채팅 · 승급 알림) |
| 배포 | Vercel(프론트엔드), Render(백엔드) |
| 테스트 | JUnit 5, Testcontainers PostgreSQL, k6 |

## 개발 흐름

1. 작업마다 GitHub 이슈를 한글로 등록합니다.
2. 기능 브랜치에서 작업하고, 이슈를 연결한 PR을 `dev`로 올립니다.
3. `dev`에 병합되면 스테이징(Vercel 미리보기 → 스테이징 백엔드 → 스테이징 DB)에서 확인합니다.
4. `dev` → `master` PR로 운영에 배포하고, 바뀐 내용은 [패치노트](https://cs-study-platform.vercel.app/changelog)와 GitHub Release에 기록합니다.

환경 구성과 설정 방법은 [docs/staging.md](docs/staging.md)를 참고하세요.

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

로컬 개발 서버에서는 리뉴얼 안내가 꺼져 있어 전체 화면으로 개발할 수 있습니다.

| 환경변수 | 용도 |
| --- | --- |
| `JDBC_DATABASE_URL` · `SPRING_DATASOURCE_USERNAME` · `SPRING_DATASOURCE_PASSWORD` | PostgreSQL 연결 |
| `ADMIN_KEY` | 32자 이상의 관리자 키. 없으면 관리자 API가 닫힙니다. |
| `GEMINI_API_KEY` | 면접 AI · RAG 답변 생성(선택) |
| `VITE_API_URL` | 개발 서버에서 쓸 API 주소. 배포 빌드는 운영 API를 씁니다. |

RAG 학습 도우미는 `rag` 프로필에서만 켜집니다. 실행 방법은 [rag-assistant](docs/rag-assistant.md)를 참고하세요.

## 검증하기

```bash
cd backend && ./gradlew test        # Docker가 있으면 동시성 테스트(Testcontainers)도 실행
cd frontend && npm run build && npm run check:questions
```

## 개발 문서

[대결 동시성](docs/duel-concurrency.md) · [커넥션 풀](docs/hikaricp-pool.md) · [RAG 학습 도우미](docs/rag-assistant.md) · [부하 테스트](load-tests/README.md) · [보안과 크롤링](docs/security.md) · [등급과 접근 권한](docs/membership.md) · [기술면접 준비](docs/technical-interview.md)
