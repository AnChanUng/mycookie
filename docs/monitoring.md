# 모니터링 (Grafana + Loki + Prometheus + Alloy)

홈서버에서 도는 나의쿠키의 **로그**와 **서버 상태(CPU, 메모리, 디스크)**를 브라우저에서 보는 곳입니다. 서버 계정이나 docker 권한 없이 팀원 모두가 운영, 스테이징을 볼 수 있습니다.

| 대시보드 | 보는 것 |
| --- | --- |
| **MyCookie Server** (첫 화면) | 서버 CPU, 메모리, 디스크 사용률, 컨테이너별 메모리(한도 대비), CPU |
| **MyCookie Logs** | 환경, 서비스, 레벨, 검색어로 로그 찾기, ERROR 수, 레벨별 로그 양 |

- 장애를 **알려 주는** 것은 Mattermost 긴급 알림(`CriticalErrorAlerts`, `healthcheck.py`)이 맡고, Grafana는 알림을 받은 뒤 **자세히 보는** 곳입니다. Grafana 알림 기능은 켜지 않습니다(알림이 두 군데서 오지 않게).
- 서비스(`devcookie`)와 **따로** 띄우고 따로 내립니다. 설정은 `deploy/monitoring/`, 데이터는 `/srv/mycookie-monitoring/`.

## 구성

| 컨테이너 | 하는 일 | 메모리 한도 |
| --- | --- | --- |
| alloy | 로그 수집(라벨, 개인정보 가림) → Loki, 서버 CPU, 메모리, 디스크 지표 → Prometheus | 256MB |
| stats | 컨테이너별 CPU, 메모리(`docker stats`와 같은 값)를 내보내는 작은 수집기(`docker_stats_exporter.py`) | 64MB |
| loki | 로그 저장, **14일** 보관 | 384MB |
| prometheus | 지표 저장, **7일**(최대 2GB) 보관 | 256MB |
| grafana | 조회 화면. 홈서버 안 `127.0.0.1:3000`에만 열림 | 256MB |

합계 한도는 약 1.2GB입니다(시험에서 실제 사용은 약 250MB). 서비스(약 3.4GB)와 합쳐도 8GB 안에 들어옵니다.

컨테이너 지표를 cAdvisor로 모으지 않는 이유: 최신 Docker의 이미지 저장 방식(containerd snapshotter)에서 cAdvisor가 컨테이너를 읽지 못합니다(`failed to identify the read-write layer ID`). 그래서 Docker API의 통계를 직접 읽습니다.

## 라벨

| 라벨 | 값 |
| --- | --- |
| `environment` | `prod`(backend-prod, frontend-prod), `staging`(backend-staging, frontend-staging), `shared`(postgres, redis, kafka, cloudflared) |
| `service` | `backend`, `frontend`, `postgres`, `redis`, `kafka`, `cloudflared` |
| `level` | 스프링 로그의 `ERROR`, `WARN`, `INFO`, `DEBUG` |

공유 인프라는 이렇게 나뉘어 있어 `shared`로 둡니다. PostgreSQL은 DB와 계정(`cookie_prod`, `cookie_staging`), Redis는 키 앞머리(`prod:`, `staging:`), Kafka는 토픽과 소비자 그룹(`prod.*`/`cookie-prod`, `staging.*`/`cookie-staging`)으로 나뉩니다.

**가리는 값:** 이메일, IP, Bearer 토큰, JWT, `password=`/`token=` 같은 값, DB 주소의 비밀번호. Loki에 저장되기 전에 가립니다(`config.alloy`의 `stage.replace`).

## 처음 띄우기 (관리자, 한 번만)

```bash
sudo /srv/devcookie/app/deploy/monitoring/up.sh
```

- `/srv/mycookie-monitoring/.env`를 만들고 Grafana 관리자 비밀번호를 무작위로 넣습니다. 확인: `sudo grep GRAFANA_ADMIN_PASSWORD /srv/mycookie-monitoring/.env`
- 설정 파일을 바꿨을 때도 같은 명령으로 다시 띄웁니다. `devcookie` 자동 배포(`deploy.sh`)는 이 스택을 건드리지 않습니다.

## 접속

| 누가 | 주소 |
| --- | --- |
| 홈서버 안 | http://127.0.0.1:3000 |
| 팀원 | Tailscale에 들어온 뒤 `http://<홈서버의 Tailscale 이름>:3000` |

인터넷에는 열지 않습니다. 팀원은 관리자가 Tailscale에 초대합니다(무료 요금제 3명까지).

## 팀원 계정

`/srv/mycookie-monitoring/.env`의 `GRAFANA_VIEWERS`에 `아이디:비밀번호`를 적고 `up.sh`를 다시 실행하면 보기 전용 계정이 만들어집니다(이미 있으면 건너뜀). 처음 한 번은 명령에 바로 넘겨도 됩니다.

```bash
sudo GRAFANA_VIEWERS="bomin:처음비밀번호" /srv/devcookie/app/deploy/monitoring/up.sh
```

- 계정은 **Viewer**(보기 전용)입니다. 운영, 스테이징 로그와 지표를 모두 볼 수 있고 대시보드는 고칠 수 없습니다.
- 첫 로그인 뒤 오른쪽 위 프로필 → **Change password**로 비밀번호를 바꿉니다.
- 화면에서 직접 만들 수도 있습니다: Administration → Users → **New user**.

## 로그 보는 법

첫 화면 **MyCookie Logs** 대시보드에서 환경, 서비스, 레벨, 검색어를 고릅니다.

| 하고 싶은 것 | 방법 |
| --- | --- |
| 운영 백엔드 오류만 | 환경 `prod`, 서비스 `backend`, 레벨 `ERROR` |
| 긴급 알림 받은 오류 찾기 | 검색어에 알림의 오류 이름(예: `CannotGetJdbcConnectionException`), 시간은 알림 시각 앞뒤로 |
| 같은 시각 DB 로그 | 환경 `shared`, 서비스 `postgres` |

직접 쿼리(Explore)를 쓸 때는 LogQL:

```
{environment="prod", service="backend", level="ERROR"}
{environment="staging", service="backend"} |= "Exception"
```
