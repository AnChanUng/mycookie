# 쿠키 도우미 검색 평가 · 2026-11-21

## 측정 결과

기존 `backend/src/test/resources/rag/eval-set.json`의 113문항을 그대로 사용했다. 정답 경로가 있는 88개에서 서로 다른 문서 5개를 반환한다. 나머지 25개도 검색 결과를 기록하되 Hit의 분모에서는 제외한다.

| 방식 | Hit@1 | Hit@5 | 상태 |
|---|---:|---:|---|
| BM25 | 73/88 (82.95%) | 85/88 (96.59%) | 공개 자료 503조각에서 측정 |
| Gemini + BM25 + RRF | 80/88 (90.91%) | 88/88 (100%) | 2026-11-23 홈서버 Java 17, gemini-embedding-001 실제 호출, 113문항 평가 완료 |

하이브리드 검색은 BM25에서 놓친 a60, a81, a86의 정답도 상위 5개에서 찾았다. 이 평가에서는 답변 모델을 호출하지 않았다. 자료 밖 25문항의 답변 거부율, 실제 답변의 사실성, 스테이징 메모리와 응답 시간은 별도 검토한다.

## 로컬 평가

JDK 17~21로 backend 폴더에서 실행한다. 키워드 평가는 키와 DB가 필요 없다.

~~~powershell
.\gradlew.bat test --tests com.csstudy.backend.chatbot.ChatbotEvalTest
~~~

Gemini 키가 환경변수 GEMINI_API_KEY로 설정된 평가용 터미널에서 아래 명령을 실행한다. 첫 실행에서 공개 조각과 질문을 임베딩 API로 보낸다. build/chatbot-eval-cache에 완료된 벡터를 저장해 재실행 때 이어간다. 답변 생성 API는 호출하지 않는다.

~~~powershell
$env:CHATBOT_EVAL = "1"
.\gradlew.bat test --tests com.csstudy.backend.chatbot.ChatbotHybridEvalTest --rerun-tasks
~~~

보고서 위치는 backend/build/reports/chatbot-bm25.json과 chatbot-hybrid.json이다. 테스트가 건너뛰어졌다면 하이브리드 보고서와 실행 날짜를 확인한다. Windows에서 한글 작업 경로 때문에 ClassNotFoundException이 나면 다음 임시 설정으로 같은 테스트를 실행한다.

~~~powershell
$init = Join-Path $env:TEMP 'mycookie-rag-local-test.gradle'
"allprojects { buildDir = new File(System.getProperty('java.io.tmpdir'), 'cookie-rag-dev-build') }" | Set-Content $init -Encoding ascii
.\gradlew.bat -I $init test --tests com.csstudy.backend.chatbot.ChatbotHybridEvalTest --rerun-tasks
~~~

## 서버에서 확인할 항목

기존 PostgreSQL에 chatbot_chunks와 chatbot_quota를 만든다. 공개 자료 변경은 frontend에서 `node --import ./scripts/extensionless-loader.mjs scripts/export-chatbot.mjs`로 반영하고 생성한 public.json도 함께 커밋한다. CI의 check:chatbot-corpus가 일치 여부를 검사한다. 비공개 문제집과 개발 자료는 내보내는 대상에 추가하지 않는다.

기본 설정에서 홈서버의 GEMINI_API_KEY를 사용하며 답변 모델은 gemini-flash-lite-latest다. API 키가 있고 기능을 켰을 때만 화면에 버튼이 나타난다. 서버 시작 뒤 /api/v1/chatbot/status의 hybridReady가 true이면 두 검색을 모두 사용할 수 있다. 색인이 중단되면 키워드 검색을 유지하며, 다음 서버 시작 때 저장된 조각부터 재사용한다. 한국 날짜 기준으로 질문 시도마다 개인 한도와 전체 한도를 같은 DB 트랜잭션에서 차감한다.

스테이징에서 실제 질문, 출처, 한도 초과 응답, 색인 전후 컨테이너 메모리를 확인한다. 503 × 768 × 4바이트는 벡터 원소만 약 1.47MiB이고, JVM·문서·키워드 색인까지 포함한 메모리는 실측해야 한다.
