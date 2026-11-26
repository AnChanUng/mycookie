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
| 어디서나(개발 PC, 휴대폰) | **https://grafana.mycookie.dev** (허락한 이메일로 인증 → Grafana 로그인) |
| 홈서버 안 | http://127.0.0.1:3000 |

두 겹으로 막습니다. **Cloudflare Access**가 허락한 이메일만 통과시키고(이메일로 받은 인증 코드), 그다음 **Grafana 로그인**을 한 번 더 합니다. 허락하지 않은 사람은 Grafana 화면까지 오지도 못합니다.

### 어디서나 보기 켜기 (관리자, 한 번만)

순서가 중요합니다. **Access(1번)를 먼저 만들고** 터널 주소(2번)를 열어야, 주소가 잠깐이라도 아무에게나 열리지 않습니다.

1. **Access 앱 만들기:** Cloudflare 대시보드 → **Zero Trust** → Access → Applications → **Add an application** → **Self-hosted**
   - Application name: `Grafana`, Session duration: `24 hours`
   - Application domain: subdomain `grafana`, domain `mycookie.dev`
   - Policy: 이름 `팀원`, Action **Allow**, Include → **Emails** → 찬웅, 보민 이메일
   - 로그인 방법은 기본값 **One-time PIN**(이메일로 코드)이면 됩니다 → Save
2. **터널 주소 열기:** Zero Trust → Networks → **Tunnels** → 사이트에 쓰는 터널 → **Public Hostname** → Add
   - Subdomain `grafana`, Domain `mycookie.dev`, Type **HTTP**, URL **`grafana:3000`** → Save
   - 터널(cloudflared)은 사이트 네트워크에 있고, Grafana도 그 네트워크에 붙어 있어 `grafana:3000`으로 찾아갑니다
3. **홈서버 설정 두 줄**
   ```bash
   # Grafana가 자기 주소를 알게(링크, 리디렉션)
   echo 'GRAFANA_ROOT_URL=https://grafana.mycookie.dev' | sudo tee -a /srv/mycookie-monitoring/.env
   sudo /srv/devcookie/app/deploy/monitoring/up.sh
   # 긴급 알림에 붙는 로그 링크
   echo 'GRAFANA_URL=https://grafana.mycookie.dev' | sudo tee -a /srv/devcookie/.env
   sudo /srv/devcookie/app/deploy/homeserver/compose.sh up -d backend-prod
   ```
4. **확인:** 시크릿 창에서 https://grafana.mycookie.dev → Cloudflare 이메일 인증 화면이 먼저 나오고, 허락한 이메일로 코드를 넣으면 Grafana 로그인 화면이 나오면 성공입니다.

팀원을 더하거나 빼려면 1번 Policy의 이메일 목록만 고칩니다(무료 요금제 50명까지).

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
## 메모리 이상 관찰 모드

운영 백엔드의 메모리 상승 후보를 15분마다 SQLite에 기록한다. 기존 stats 컨테이너에서 Prometheus와 Loki를 조회한다. 실제 장애 판정과 알림 발송은 운영자가 관찰 결과를 평가한 뒤 결정한다.

관리자는 변경이 반영된 배포 폴더에서 설치한다.

```sh
cd /srv/devcookie/app/deploy/monitoring
sudo install -d /usr/local/lib/mycookie-memory-observation
sudo install -m 0644 memory_anomaly.py observe_memory.py /usr/local/lib/mycookie-memory-observation/
sudo install -m 0644 mycookie-memory-observation.service mycookie-memory-observation.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start mycookie-memory-observation.service
sudo systemctl enable --now mycookie-memory-observation.timer
systemctl list-timers mycookie-memory-observation.timer
```

실행 기록은 `journalctl -u mycookie-memory-observation.service`에서 확인한다. DB는 `/var/lib/mycookie-memory-observation/history.sqlite3`에 있다. `runs`에는 각 조회 종료 시점의 7일 검사 범위 통계를, `events`에는 컨테이너와 탐지 시각별로 최초 기록한 근거를 보관한다. 최근 하루에 탐지된 사건 중 이후 15분의 로그를 조회할 수 있는 사건을 수집한다. 하루를 넘는 실행 공백은 별도 과거 재생이 필요하다. 중단하려면 `sudo systemctl disable --now mycookie-memory-observation.timer`를 실행한다.
### 운영 API 5xx 관찰

같은 타이머가 메모리 조회에 앞서 Loki의 운영 Nginx 로그에서 최근 한 시간의 API 응답을 5분 단위로 집계한다. 초기 관찰 기준은 한 구간에 5xx가 3건 이상이면서 전체 API 응답의 5% 이상인 경우다. 임계값은 운영 장애 이력과 대조해 조정한다. 연속 세 구간에서 기준을 넘으면 세 구간이 기록된다.

`api_runs`에는 조회 종료 시각, 상태와 요청이 관측된 구간 수를 남긴다. 요청 기록이 없는 구간만 있으면 `no_observed_requests`, Loki 접속에 실패하면 `loki_unavailable`로 기록한다. `api_events`에는 기준을 넘은 구간의 종료 시각, 최초 저장 시각(UTC), 요청 수와 실패 수를 남긴다. 시간 범위가 겹치는 재조회에서는 같은 구간이 한 번만 저장된다. 타이머가 한 시간 이상 멈추면 오래된 구간은 별도 재생이 필요하다.
