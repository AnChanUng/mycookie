# 노트 문제풀이 (웹노트 · 전공노트)

웹노트(웹 필수지식)와 전공노트를 읽은 뒤 객관식 · 단답형으로 확인하는 문제집입니다.

| 문제집 | 주소 | 근거 노트 | 문항 |
| --- | --- | --- | --- |
| 웹노트 문제풀이 | `/web/webnote` | `frontend/src/data/webEssentials.js` 57문답 | 객관식 57 · 단답형 48 |
| 전공노트 문제풀이 | `/cs/csnote` | `frontend/src/data/csNotes.js` 169개념 | 객관식 169 · 단답형 131 |

허브 카드는 `/web`(웹 기본기)와 `/cs`(학습 메뉴)에 있습니다. 풀이 화면은 기존 문제집 화면(`ExamCompanyPage`)을 그대로 쓰므로 모의고사 · 영역별 연습 · 오답노트 · 북마크 · 풀이 기록이 다른 문제집과 똑같이 동작합니다.

## 파일

- `frontend/src/data/webNoteQuestions.js` 웹노트 문제. 노트 id(`web-…`)마다 `mc`(객관식) 1개, 답이 용어로 정해지면 `sa`(단답형) 1개
- `frontend/src/data/csNoteQuestions1.js` · `csNoteQuestions2.js` 전공노트 문제. `[노트 id, 객관식, 단답형?]` 묶음
- `frontend/src/data/csNoteQuestions.js` 전공노트 과목 → 문제집 영역 묶기, 문항 id · 링크 만들기
- `frontend/src/data/csNoteTopics.js` 전공노트 면접 질문의 짧은 주제 이름(문제 화면의 주제 칩)
- `frontend/src/data/noteQuizPlace.js` 정답 보기 위치를 문항 id 해시로 고르게 퍼뜨림
- `frontend/scripts/check-note-quiz.mjs` 검사(`npm run check:note-quiz`, CI에서 자동 실행)

## 문항 규칙

- 문항 id: 웹노트 `wn-<노트>-o|s`, 전공노트 `cn-<노트 id>-o|s`. **한 번 공개한 id는 바꾸지 않습니다**(풀이 기록 · 오답노트가 id에 묶임).
- 객관식은 4지선다입니다. 데이터의 `a`는 쓴 순서 기준 정답이고, 화면에는 `placeAnswer`가 id 해시 칸으로 옮긴 순서로 나옵니다. 같은 id는 항상 같은 순서입니다.
- 단답형은 `strict: true`로 **자동 채점만** 합니다. 입력을 `normAns`(공백 · 괄호 · 점 · 가운뎃점 · 따옴표 · 밑줄 · 하이픈 제거, 소문자)로 바꿔 허용 답안(`acc`)과 같으면 정답, 다르면 바로 오답입니다. 서술형은 두지 않습니다.
  - 허용 답안에는 우리말 · 영문 · 약어 · 흔한 띄어쓰기 변형을 넣습니다(예: `멱등성`, `멱등`, `idempotent`).
  - 답이 문장이 되는 노트는 단답형을 만들지 않습니다.
- 모든 문항에 `link`(근거 노트 주소)가 있어 풀이 후 "노트 다시 읽기"로 돌아갑니다. 상세 해설 대신 노트가 그 역할을 합니다(`check:explanations`에서 상세 해설 검사 대상에서 뺌).

## 검사 (`check:note-quiz`)

- 모든 노트에 객관식이 하나 이상 있는지, 가리키는 노트가 있는지
- 단답형이 `strict`인지, 모범답안에 허용 답안 중 하나가 들어 있는지
- 정답 번호가 한 칸에 40% 넘게 몰리지 않았는지
- 정답 보기만 다른 보기보다 10% 넘게 긴 문제가 25%를 넘지 않는지(길이로 정답을 찍지 못하게)
- 주제 칩이 26자를 넘지 않는지

## 근거와 확인 범위

[문제 출제 원칙](question-authoring.md)에 따라 근거 자료를 적습니다.

- **웹노트 문제**는 각 노트의 근거 문서(`webEssentials.js`의 `references`)를 그대로 따릅니다. RFC 9110 · 9113 · 9114 · 7519 · 8725, Spring Framework 문서(DI · AOP 프록시 · 선언적 트랜잭션 · 빈 스코프 · 테스트 트랜잭션 · MockMvc), OWASP Cheat Sheet(SQL Injection · XSS · CSRF · 세션 · JWT · 의존성), PostgreSQL 문서(인덱스 · EXPLAIN · 격리 수준 · 복제), OpenJDK JEP 444, Oracle Java 21 GC · JFR, Gradle Dependency Locking, Kubernetes Deployments, NIST SP 800-145, AWS Lambda · S3 · Builders' Library, Azure Cache-Aside · Sharding, Elasticsearch NRT, OpenTelemetry, Martin Fowler(Parallel Change · Value Object · DTO · Microservices · TDD).
- **전공노트 문제**는 노트 본문을 기준으로 썼고, 해설에 기준이 되는 명세 · 문서 이름을 적었습니다. 예: RFC 9110(HTTP 메서드 · 상태 코드), JLS(기본형 크기 · 타입 소거 · 오버로딩), Spring Framework 문서(빈 스코프 · 전파 속성 · 롤백 규칙), Python 문서(GIL · free-threaded 빌드 3.13 · functools.wraps · C3 MRO), OWASP Password Storage(Argon2id · salt), Redis(RDB · AOF), Elasticsearch(역색인 · NRT), Hadoop HDFS.
- **확인 범위**: 2026-11-25 첫 작성 때는 노트 본문과 위 문서의 알려진 내용을 기준으로 썼고, **문서 원문을 문항마다 다시 열어 대조하지는 않았습니다.** 오류 제보가 오거나 해당 노트를 고칠 때 원문과 대조해 이 표에 확인한 링크와 내용을 추가합니다.
- 버전에 따라 달라지는 내용은 문항에 기준을 적었습니다: 가상 스레드(Java 21), record(Java 16), HTTP/3(QUIC), CPython 3.13 free-threaded 빌드, Spring Boot 기본 CGLIB 프록시.

## 문항 추가 · 수정

1. 노트를 새로 만들면 같은 노트 id로 객관식을 추가합니다(검사가 빠진 노트를 잡음). 전공노트 면접 질문이면 `csNoteTopics.js`에 짧은 주제도 넣습니다.
2. 보기는 서로 비슷한 길이로 씁니다. 정답만 길어지면 오답에 그럴듯한 조건을 붙입니다.
3. `npm run check:note-quiz && npm run check:questions && npm run check:explanations`로 확인합니다.
