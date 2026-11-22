# 작업 규칙

## 인프라: 온프레미스 (홈서버)
- 노트북 서버는 **홈서버**라고 부른다(문서, 대화, 커밋 메시지 모두).
- 화면(nginx) · 백엔드 · PostgreSQL · Redis · Kafka를 그램 노트북 한 대에서 Docker Compose로 돌린다(`deploy/homeserver/`, 문서 `docs/homeserver.md`). 설계할 때 항상 이 전제를 지킨다.
- `frontend/vercel.json`의 보안 헤더를 고치면 `node frontend/scripts/export-nginx-headers.mjs`로 그램 nginx 헤더도 다시 만든다.
- 메모리 8GB 안에서 모두 돌아야 한다. 새 컨테이너나 무거운 기능을 넣을 때는 `mem_limit`과 합계를 확인한다.
- 모니터링(Grafana, Loki, Prometheus, Alloy)은 서비스와 분리된 Compose 프로젝트(`deploy/monitoring/`, 문서 `docs/monitoring.md`)로 돌린다. 로그에 개인정보가 남지 않게 `config.alloy`에서 가린다.
- 특정 클라우드 전용 서비스(관리형 큐, 메일 API, 서버리스 등)에 묶이지 않는다. 표준 프로토콜과 직접 띄울 수 있는 것만 쓴다(PostgreSQL, SMTP, Redis 등).
- 사라지면 안 되는 상태는 PostgreSQL에 둔다. 접속자 수, 요청 제한처럼 짧게 사는 상태는 Redis에, 느린 후속 작업(이슈 생성, 알림)은 Kafka 이벤트로 넘긴다. 둘 다 멈춰도 사이트가 돌도록 메모리 값과 바로 처리로 대신하는 길을 남긴다(`REDIS_ENABLED`, `KAFKA_ENABLED`).
- 접속 주소, 키, 메일 서버 같은 환경 값은 모두 환경변수로 받고 `deploy/homeserver/.env.example`과 `deploy/homeserver/docker-compose.yml`에 같이 적는다.
- DB는 지금 JPA `ddl-auto: update`로 스키마를 만든다. 온프레미스 DB로 옮길 때 마이그레이션 도구(Flyway 등) 도입을 검토한다.

## 예외 처리 (backend/.../exception/)
- 오류는 `CookieErrorCode`(상태, 이름, 사용자 문구)에 한 줄 추가하고 `throw new CookieException(CookieErrorCode.이름)`으로 던진다. 새 코드에서 `ResponseStatusException`이나 컨트롤러별 `@ExceptionHandler`를 새로 만들지 않는다.
- 응답은 전체 예외 처리 `CookieExceptionHandler`가 `{code, error}` 한 모양으로 만든다. 화면은 `error`를 보여 주고, 분기가 필요하면 `code`를 본다.
- 문구에는 내부 정보(SQL, 클래스 이름, 개인정보)를 넣지 않는다. 예상 못 한 예외는 500으로 감추고 ERROR 로그로 남긴다(긴급 알림이 이 로그를 센다).
- 기존 `ResponseStatusException`도 같은 모양으로 나가니, 그 코드를 고칠 때 `CookieException`으로 바꿔 나간다.

## 비공개 페이지와 권한
- 비공개 페이지는 주소를 숨기지 않고 계정 권한으로 막는다. 화면은 `RoleGate`(ADMIN, OWNER, TEAM)로, 서버 API는 `RoleService.require`로 같은 권한을 확인한다.
- 권한 부여와 관리자 계정 생성은 홈서버의 관리자 키로만 한다(`deploy/homeserver/account.sh`, 문서 `docs/homeserver.md`). 인터넷 쪽 화면에 이 기능을 만들지 않는다.
- 찬웅 전용(OWNER) 자료 중 민감한 것(자소서, 면접 기록)은 화면 코드에 넣지 말고 서버에 저장해 권한으로 내려준다.

## 패치노트 (frontend/src/data/patchNotes.js, frontend/src/data/changelog.js)
- 사용자가 체감하는 기능 변화만 적는다. 부하 테스트, 성능 측정, 인프라, 문서, 리팩터링 같은 비기능 항목은 넣지 않는다.
- 핵심만 짧게. 버전당 항목 3~4개 이내, 자잘한 수정은 생략한다.

## 브랜치와 PR (원본: CONTRIBUTING.md)
- 먼저 열린 PR과 이슈를 확인한다. 같은 기능·개선 묶음은 기존 PR에 후속 커밋으로 모으고, 관련 이슈가 20개 이상이어도 한 PR에 연결할 수 있다. 이슈 개수나 변경 줄 수를 이유로 PR을 나누지 않는다.
- 새 브랜치는 새 작업 묶음을 시작할 때 만든다. 배포 시점·승인 담당이 다르거나 독립적으로 배포할 작업이면 분리한다. 개인 학습·개발 일지·기술 블로그 초안은 개인 메모로 관리하고 협업 검토 요청이 있을 때 이슈·PR로 공유한다.
- 흐름은 항상 작업 브랜치 → `dev` → `master`다. 새 작업 묶음은 **최신 `dev`에서 새 작업 브랜치**(`feature/`, `fix/`, `docs/`, `refactor/`, `chore/`, `hotfix/`)를 따서 작업하고 `dev`로 PR을 올린다. 세션이 정해 준 브랜치 이름이 이 규칙과 다르면 규칙을 따른다. `dev`, `master`에 직접 커밋, 푸시하지 않는다.
- `master`에는 `dev` → `master` PR만 올리고, 운영 머지는 관리자만 한다. 이 PR은 `release-pr.yml`이 dev 푸시마다 열거나 목록을 갱신하니 손으로 만들지 않는다.
- 커밋과 PR 제목은 `타입: 한글 요약`(feat, fix, docs, refactor, test, perf, style, ci, build, chore, release, revert). PR 본문은 결과 요약·관련 이슈·검증 결과를 적고, 화면 자료나 배포 주의는 해당할 때 추가한다.
- 리뷰어(찬웅 `AnChanUng`, 보민 `hiu001045`)는 `auto-assign.yml`이 자동으로 요청한다(작성자 본인은 GitHub이 막아 빠진다).
- PR 위험도는 `.github/workflows/pr-risk.yml`이 바뀐 파일로 정한다(낮음: 자동 머지, 중간: 저장소 주인 승인, 높음: 작성자 아닌 1명 승인 필수. 단 저장소 주인이 올린 PR은 중간, 높음 모두 CI 통과 시 dev까지 자동 머지하고 높음은 "사후 리뷰" 라벨). 유료 API(Claude API 등)를 쓰는 자동화는 넣지 않는다. 새 민감 영역(보안, 결제, 스키마, 배포)을 만들면 그 파일의 높음 목록에 경로를 추가한다.
- 브랜치 규칙 원본은 `.github/rulesets/`에 둔다. 새 PR과 이슈의 담당자는 저장소 주인으로 자동 지정된다(`.github/workflows/auto-assign.yml`).

## 커밋과 PR에 비밀 사항을 적지 않는다
- 커밋 메시지, PR 제목과 본문과 댓글, 브랜치 이름, 코드 주석에 비밀 사항을 적지 않는다. 비밀번호, 키, 토큰, 내부 주소는 물론 계정 닉네임, 개인 자료(이력서, 자소서, 면접 내용), 개인 페이지의 이름, 특정 계정을 가리키는 표현도 포함한다.
- 돌려서 말하지도 않는다. 별칭, 초성, 줄임말, 일부만 가린 값, "그 계정"처럼 누구인지 짐작할 수 있는 표현을 쓰지 않고 "소유자 전용", "지정한 계정" 같은 일반 표현만 쓴다.
- 그런 값이 필요한 설정은 서버 환경변수나 DB에 두고, 문서와 PR에는 "홈서버 `.env`에 적는다"까지만 쓴다. 비공개 자료는 화면 코드가 아니라 서버에 저장해 권한으로 내려준다(위 "비공개 페이지와 권한").
- 커밋과 PR을 만들기 전에 값, 닉네임, 개인 자료, 내부 주소가 들어갔는지 훑는다. 실수로 올렸다면 PR 글은 바로 고치고, 이미 커밋된 것은 사용자와 정해서 처리한다.
