# 작업 규칙

## 인프라: 온프레미스 (홈서버)
- 노트북 서버는 **홈서버**라고 부른다(문서, 대화, 커밋 메시지 모두).
- 화면(nginx) · 백엔드 · PostgreSQL · Redis · Kafka를 그램 노트북 한 대에서 Docker Compose로 돌린다(`deploy/homeserver/`, 문서 `docs/homeserver.md`). 설계할 때 항상 이 전제를 지킨다.
- `frontend/vercel.json`의 보안 헤더를 고치면 `node frontend/scripts/export-nginx-headers.mjs`로 그램 nginx 헤더도 다시 만든다.
- 메모리 8GB 안에서 모두 돌아야 한다. 새 컨테이너나 무거운 기능을 넣을 때는 `mem_limit`과 합계를 확인한다.
- 로그 모니터링(Grafana, Loki, Alloy)은 서비스와 분리된 Compose 프로젝트(`deploy/monitoring/`, 문서 `docs/monitoring.md`)로 돌린다. 로그에 개인정보가 남지 않게 `config.alloy`에서 가린다.
- 특정 클라우드 전용 서비스(관리형 큐, 메일 API, 서버리스 등)에 묶이지 않는다. 표준 프로토콜과 직접 띄울 수 있는 것만 쓴다(PostgreSQL, SMTP, Redis 등).
- 사라지면 안 되는 상태는 PostgreSQL에 둔다. 접속자 수, 요청 제한처럼 짧게 사는 상태는 Redis에, 느린 후속 작업(이슈 생성, 알림)은 Kafka 이벤트로 넘긴다. 둘 다 멈춰도 사이트가 돌도록 메모리 값과 바로 처리로 대신하는 길을 남긴다(`REDIS_ENABLED`, `KAFKA_ENABLED`).
- 접속 주소, 키, 메일 서버 같은 환경 값은 모두 환경변수로 받고 `deploy/homeserver/.env.example`과 `deploy/homeserver/docker-compose.yml`에 같이 적는다.
- DB는 지금 JPA `ddl-auto: update`로 스키마를 만든다. 온프레미스 DB로 옮길 때 마이그레이션 도구(Flyway 등) 도입을 검토한다.

## 패치노트 (frontend/src/data/patchNotes.js, frontend/src/data/changelog.js)
- 사용자가 체감하는 기능 변화만 적는다. 부하 테스트, 성능 측정, 인프라, 문서, 리팩터링 같은 비기능 항목은 넣지 않는다.
- 핵심만 짧게. 버전당 항목 3~4개 이내, 자잘한 수정은 생략한다.

## 브랜치와 PR
- 작업 브랜치(`feature/*`, `fix/*`)는 항상 `dev`로 PR을 올린다. `master`에는 `dev` → `master` PR만 올리고, 운영 머지는 관리자만 한다.
- PR 위험도는 `.github/workflows/pr-risk.yml`이 바뀐 파일로 정한다(낮음: 자동 머지, 중간: 저장소 주인 승인, 주인이 올린 PR은 바로 머지 가능, 높음: 작성자 아닌 1명 승인 필수). 유료 API(Claude API 등)를 쓰는 자동화는 넣지 않는다. 새 민감 영역(보안, 결제, 스키마, 배포)을 만들면 그 파일의 높음 목록에 경로를 추가한다.
- 브랜치 규칙 원본은 `.github/rulesets/`에 둔다. 새 PR과 이슈의 담당자는 저장소 주인으로 자동 지정된다(`.github/workflows/auto-assign.yml`).

