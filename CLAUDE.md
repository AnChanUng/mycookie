# 작업 규칙

## 앞으로의 인프라: 온프레미스
- 서버와 DB는 나중에 온프레미스(자체 서버)로 직접 구축한다. 설계할 때 항상 이 전제를 지킨다.
- 특정 클라우드 전용 서비스(관리형 큐, 메일 API, 서버리스 등)에 묶이지 않는다. 표준 프로토콜과 직접 띄울 수 있는 것만 쓴다(PostgreSQL, SMTP, Redis 등).
- 상태는 PostgreSQL에 둔다. 메모리에만 두는 상태는 재시작이나 여러 대 운영에서 깨지지 않는지 확인한다.
- 접속 주소, 키, 메일 서버 같은 환경 값은 모두 환경변수로 받고 `deploy/homeserver/.env.example`과 `deploy/homeserver/docker-compose.yml`에 같이 적는다.
- DB는 지금 JPA `ddl-auto: update`로 스키마를 만든다. 온프레미스 DB로 옮길 때 마이그레이션 도구(Flyway 등) 도입을 검토한다.

## 패치노트 (frontend/src/data/patchNotes.js, frontend/src/data/changelog.js)
- 사용자가 체감하는 기능 변화만 적는다. 부하 테스트, 성능 측정, 인프라, 문서, 리팩터링 같은 비기능 항목은 넣지 않는다.
- 핵심만 짧게. 버전당 항목 3~4개 이내, 자잘한 수정은 생략한다.
