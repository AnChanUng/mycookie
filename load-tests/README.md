# 로컬 개발환경 k6 부하테스트

운영 Vercel/Render와 분리한 Spring Boot + PostgreSQL에서 실행한다. `dev`라는 브랜치 이름만으로 환경이 분리되는 것은 아니다. 스크립트는 `127.0.0.1` 또는 `localhost`의 명시적인 포트만 허용한다.

## 준비

Java 17 이상, PostgreSQL 17, k6 1.3.0을 사용한다. 이번 실행에서는 k6 공식 릴리스 파일의 SHA256을 공식 체크섬과 대조했다. 테스트는 브라우저 렌더링을 제외한 HTTP API 성능을 측정한다.

별도 로컬 PostgreSQL을 `127.0.0.1:55432`에서 실행하고 `cs_study_k6` DB를 만든다. 아래는 PostgreSQL 도구가 PATH에 있는 경우의 예다. `PGDATA_K6`는 기존 데이터 디렉터리와 달라야 한다. 로컬 전용 클러스터이므로 외부 인터페이스에 노출하지 않는다.

```bash
export PGDATA_K6=/tmp/cs-study-k6-postgres
initdb -D "$PGDATA_K6" --locale=C.UTF-8 --auth-local=trust --auth-host=trust -U postgres
pg_ctl -D "$PGDATA_K6" -l /tmp/cs-study-k6-postgres.log -o '-h 127.0.0.1 -p 55432 -k /tmp' -w start
createdb -h 127.0.0.1 -p 55432 -U postgres cs_study_k6
```

앱을 빌드하고 별도 터미널에서 실행한다. 이 프로필은 JDBC 환경변수 대신 위 로컬 DB를 사용하고, 서버도 루프백에만 바인딩한다. 관리자 키, Slack, Gemini 호출을 비활성화한다. JVM 힙은 1 GiB, DB 커넥션 풀은 10개다.

```bash
cd backend
bash gradlew test bootJar
java -Xms256m -Xmx1g -jar build/libs/cs-study-backend-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=loadtest \
  --app.security.rate-limit-enabled=false
```

앱 초기화가 끝나 `/api/v1/categories`가 정상 응답하면 저장소 루트에서 가상 데이터를 넣는다. `seed.sql`은 로컬 `cs_study_k6` DB인지 확인하며, `k6-` 접두사의 테스트 이벤트만 초기화한다. 200명의 가상 풀이 사용자와 30일간의 이용 이벤트 8,000건(열람 6,000건, 풀이 완료 2,000건)을 만든다. 실제 계정이나 운영 데이터는 가져오지 않는다.

```bash
psql -h 127.0.0.1 -p 55432 -U postgres -d cs_study_k6 -f load-tests/seed.sql
k6 run -e PROFILE=smoke load-tests/study-api.js
k6 run -e PROFILE=load load-tests/study-api.js
```

## 시나리오와 판정

| 실행 | 부하 | 판정 |
| --- | --- | --- |
| smoke | 1 VU, 3회 반복 | 상태 코드와 JSON 구조, 오류율, 지연 시간 |
| load | 120초 동안 10 → 30 → 60 → 100 VU, 100 VU 유지 후 종료 | 오류율 1% 미만, p95 500ms 미만, p99 1초 미만, 각 API p95 500ms 미만 |
| rate-limit | 같은 IP에서 문제 상세 200회 요청 | 정상 응답 후 429 차단, Retry-After, 5xx 없음 |

VU는 가상 사용자다. 한 VU는 카테고리 목록, DB 과목 문제 목록, 문제 상세, 순위, 채팅 목록, 등급, 공개 이용 통계를 조회하고 가상 방문 기록을 저장한 뒤 1초 쉰다. 방문자 ID는 VU별로 분리한다. 각 응답의 구조도 검사하므로 HTTP 200만 반환하는 잘못된 응답을 성공으로 세지 않는다.

성능 실행에서는 요청 제한을 로컬 실행 인자로만 끈다. 모든 VU가 같은 루프백 IP를 사용하므로, 분당 180회인 문제 조회 제한에 걸리는 결과와 서버 처리 능력을 구분하기 위해서다. 운영 설정은 바꾸지 않는다.

요청 제한 검증은 앞선 로컬 서버를 종료하고 **다시 시작한 서버**에서 실행한다. 요청 제한이 기본 활성화된 `loadtest` 프로필을 그대로 사용한다. 다른 클라이언트가 이 서버를 호출하지 않아야 한다.

```bash
cd backend
java -Xms256m -Xmx1g -jar build/libs/cs-study-backend-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=loadtest
```

저장소 루트에서 실행한다.

```bash
k6 run -e PROFILE=rate-limit load-tests/study-api.js
```

준비 요청이 문제 조회 제한 1회를 사용하므로, 새 서버에서 본문 200회는 179회 성공과 21회 429가 기대된다. 이 실행에서 429는 의도한 차단이며 오류율과 별개로 검증한다. 각 실행의 요약 JSON은 `load-tests/results/`에 저장한다. `BASE_URL`과 `REPORT_PATH` 환경변수로 로컬 포트와 결과 파일을 지정할 수 있다.

## 해석 범위

결과는 단일 클라우드 개발 머신의 PostgreSQL 가상 데이터와 API 요청 조합에만 해당한다. 운영 배포의 네트워크 지연, Render 인스턴스 사양과 콜드 스타트, 장기간 증가한 데이터, 비밀번호 해싱, 코드 실행, SSE 장기 연결과 채팅 전송 성능은 별도 측정해야 한다. 100 VU 통과를 운영 서비스가 100명의 모든 행동을 항상 감당한다는 의미로 해석하지 않는다. VU는 DAU나 MAU도 아니다.

[2026-10-21 실제 실행 결과](reports/2026-10-21.md)

홈서버(그램 노트북)의 실제 구성에서 재려면 [홈서버 부하테스트](HOMESERVER.md)를 따른다.

## 그래프로 확인하기

[부하테스트 진행 방법과 그래프 읽는 법](READ-RESULTS.md)을 함께 참고한다. k6 기본 웹 대시보드를 켜고 실행하면 사용자 수, 처리량, 응답시간과 실패율의 시간 변화를 볼 수 있다. 실행이 끝나면 HTML 보고서가 생성된다.

```bash
mkdir -p load-tests/results
K6_WEB_DASHBOARD=true \
K6_WEB_DASHBOARD_EXPORT=load-tests/results/dashboard.html \
k6 run -e PROFILE=load load-tests/study-api.js
```

생성한 `dashboard.html`을 다운로드한 뒤 브라우저에서 연다. GitHub 파일 페이지는 HTML을 실행하지 않고 소스만 보여주므로 파일을 내려받아 열어야 한다. 실행 중 대시보드는 실행 머신 내부에서만 접근할 수 있으며, 클라우드 머신의 루프백 주소는 사용자 브라우저에서 바로 열 수 없다.

생성된 HTML을 한국어로 바꾸려면 다음 명령을 실행한다. 그래프 제목과 설명, 표의 표시만 번역하며 측정 이벤트가 유지되는지 검사한다.

```bash
python3 load-tests/tools/localize-report.py load-tests/results/dashboard.html
```
