# 로그 모니터링 (Grafana + Loki + Alloy)

홈서버에서 도는 나의쿠키 컨테이너의 로그를 브라우저에서 찾아보는 곳입니다. 서버 계정이나 docker 권한 없이 팀원 모두가 운영, 스테이징 로그를 볼 수 있습니다.

- 장애를 **알려 주는** 것은 Mattermost 긴급 알림(`CriticalErrorAlerts`, `healthcheck.py`)이 맡고, Grafana는 알림을 받은 뒤 **자세히 보는** 곳입니다. Grafana 알림 기능은 켜지 않습니다(알림이 두 군데서 오지 않게).
- 서비스(`devcookie`)와 **따로** 띄우고 따로 내립니다. 설정은 `deploy/monitoring/`, 데이터는 `/srv/mycookie-monitoring/`.
- CPU, 메모리 같은 지표는 다루지 않습니다(필요해지면 Prometheus를 검토).

## 구성

| 컨테이너 | 하는 일 | 메모리 한도 |
| --- | --- | --- |
| alloy | `devcookie` 컨테이너 로그를 Docker에서 읽어 라벨을 붙이고, 개인정보를 가려 Loki로 보냄 | 192MB |
| loki | 로그 저장, **14일** 보관 | 384MB |
| grafana | 로그 조회 화면. 홈서버 안 `127.0.0.1:3000`에만 열림 | 256MB |

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

## 팀원 계정 (관리자)

Grafana → Administration → Users → **New user**. 새 계정은 기본으로 **Viewer**(보기 전용)입니다. 운영, 스테이징 로그를 모두 볼 수 있고 대시보드는 고칠 수 없습니다.

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
