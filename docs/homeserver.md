# 그램 온프레미스 서버

나의쿠키의 화면 · 백엔드 · DB를 LG 그램 노트북 한 대로 옮깁니다. Vercel · Render · Neon 없이 직접 운영합니다.

| 구분 | 지금 | 그램 서버 |
| --- | --- | --- |
| 화면 (`master`) | Vercel | 노트북 `frontend-prod`(nginx) → `https://mycookie.dev` |
| 화면 (`dev`) | Vercel 미리보기 | 노트북 `frontend-staging` → `https://staging.mycookie.dev` |
| 백엔드 | Render 운영 · 스테이징 | 노트북 `backend-prod` · `backend-staging` (화면과 같은 주소의 `/api/`) |
| DB | Neon main · staging | 노트북 PostgreSQL 18 (`cookie_prod` · `cookie_staging`), 매일 새벽 4시 백업 |
| 외부 노출 | Vercel · Render | Cloudflare Tunnel (공유기 포트 개방 없음) |
| 배포 | 각 서비스 자동 배포 | `deploy.sh`가 5분마다 브랜치를 확인해서 바뀐 쪽의 백엔드 · 화면을 다시 빌드 |

파일은 [`deploy/homeserver/`](../deploy/homeserver)에 있습니다.

```
방문자 → Cloudflare(HTTPS) ⇄ cloudflared → frontend(nginx) ─┬─ 화면 파일
                                                            └─ /api/ → backend → PostgreSQL
```

노트북의 포트는 하나도 열지 않습니다. cloudflared가 노트북에서 Cloudflare로 바깥 연결을 만들고, 요청은 그 연결로만 들어옵니다.
화면과 API가 같은 주소라 CORS 설정이 필요 없고, nginx가 Vercel과 같은 보안 헤더를 붙입니다(`frontend/nginx/`).

메모리(8GB 기준): 백엔드 1GB + 768MB, PostgreSQL 768MB, nginx 64MB × 2, cloudflared 약 50MB. 나머지는 OS와 파일 캐시가 씁니다.

## 준비물

- 8GB 이상 USB (설치 후 다시 써도 됨)
- **Cloudflare에 연결된 도메인**: `mycookie.dev`(가비아)의 네임서버를 Cloudflare로 바꿉니다. Cloudflare에서 사이트 추가(무료 요금제) → 안내하는 네임서버 2개를 가비아 도메인 관리의 네임서버 설정에 넣습니다. 바꾸기 전에 지금 DNS 레코드(Vercel A · CNAME)가 Cloudflare에 그대로 옮겨졌는지 확인합니다.
- **백업용 외장 디스크(권장)**: 노트북 디스크가 고장 나면 DB도 같이 사라지므로 백업 복사본을 둘 곳
- 노트북 안의 자료 백업. **설치하면 디스크가 전부 지워집니다.**

## 1. Ubuntu Server 설치

1. [Ubuntu Server 24.04 LTS](https://ubuntu.com/download/server) ISO를 받아 [Rufus](https://rufus.ie)로 USB에 굽습니다.
2. 노트북을 껐다 켜며 부팅 메뉴 키로 USB 부팅합니다(LG 그램은 F10, BIOS는 F2. 다른 제조사는 F12 · F9 · Esc 등). 안 되면 BIOS에서 Secure Boot를 끕니다.
3. 설치 화면에서
   - 네트워크: Wi-Fi를 골라 집 공유기에 연결합니다(유선 랜이 있으면 유선이 더 안정적).
   - 디스크: **Use an entire disk** (LVM 기본값 그대로).
   - 사용자: 관리용 계정 하나(예: `cookie`), 서버 이름 `devcookie`.
   - **Install OpenSSH server** 체크. GitHub 계정에서 SSH 키 가져오기를 고르면 키 등록까지 끝납니다.
   - 추가 snap은 고르지 않습니다(Docker는 아래에서 공식 저장소로 설치).
4. 재부팅 후 USB를 뽑고, 다른 PC에서 접속되는지 확인합니다.

```bash
ssh cookie@devcookie.local
```

`.local`로 안 되면 공유기 관리 화면에서 노트북 IP를 찾아 접속하고, 공유기에서 이 노트북에 **고정 IP(DHCP 예약)**를 걸어 둡니다.

## 2. 노트북을 서버로 쓰기 위한 설정

```bash
# 덮개를 닫아도 잠들지 않게
sudo sed -i 's/^#\?HandleLidSwitch=.*/HandleLidSwitch=ignore/; s/^#\?HandleLidSwitchExternalPower=.*/HandleLidSwitchExternalPower=ignore/; s/^#\?HandleLidSwitchDocked=.*/HandleLidSwitchDocked=ignore/' /etc/systemd/logind.conf
sudo systemctl restart systemd-logind
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

# 화면은 1분 뒤 끈다(전력 · 발열)
sudo sed -i 's/^GRUB_CMDLINE_LINUX_DEFAULT="\(.*\)"/GRUB_CMDLINE_LINUX_DEFAULT="\1 consoleblank=60"/' /etc/default/grub
sudo update-grub

# Wi-Fi 절전 끄기(절전 중 연결이 끊기는 것 방지)
sudo apt install -y iw
echo 'ACTION=="add", SUBSYSTEM=="net", KERNEL=="wl*", RUN+="/usr/sbin/iw dev $name set power_save off"' | sudo tee /etc/udev/rules.d/70-wifi-powersave.rules
```

- **배터리**: 늘 충전기에 꽂아 두면 배터리가 부풉니다. BIOS나 제조사 기능(삼성 배터리 수명 연장, LG 배터리 케어, Lenovo Conservation Mode 등)에 **충전 상한 60~80%**가 있으면 켭니다. 배터리는 정전 때 UPS 역할을 하므로 빼지 않습니다.
  LG 그램은 Ubuntu에서도 `lg-laptop` 드라이버로 80% 상한을 걸 수 있습니다.

```bash
# 80 또는 100만 받는다. 재부팅해도 유지되도록 systemd 서비스로 건다
echo 80 | sudo tee /sys/class/power_supply/BAT*/charge_control_end_threshold
sudo tee /etc/systemd/system/battery-limit.service >/dev/null <<'EOF'
[Unit]
Description=배터리 충전 상한 80%
[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo 80 > /sys/class/power_supply/BAT*/charge_control_end_threshold'
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable battery-limit.service
```
- **발열**: 덮개를 조금 열어 두거나 받침대에 올려 바닥 통풍구가 막히지 않게 둡니다.
- **스왑**: RAM이 8GB라 빌드 중에 모자랄 수 있습니다. `swapon --show`로 확인하고 없거나 2GB 미만이면 늘립니다.

```bash
sudo swapoff /swap.img 2>/dev/null; sudo fallocate -l 4G /swap.img && sudo chmod 600 /swap.img && sudo mkswap /swap.img && sudo swapon /swap.img
grep -q swap.img /etc/fstab || echo '/swap.img none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. 보안

```bash
# SSH 비밀번호 로그인 끄기 (키 접속이 되는 것을 먼저 확인한 뒤에)
echo -e 'PasswordAuthentication no\nPermitRootLogin no' | sudo tee /etc/ssh/sshd_config.d/10-hardening.conf
sudo systemctl restart ssh

# 방화벽: SSH만 연다. 터널은 바깥으로 나가는 연결이라 열 포트가 없다
sudo ufw allow OpenSSH
sudo ufw enable

# 보안 업데이트 자동 설치
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

집 밖에서 SSH로 들어가야 하면 공유기 포트를 열지 말고 [Tailscale](https://tailscale.com)을 노트북과 내 PC에 설치해 씁니다.

## 4. Docker 설치

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
```

## 5. 배포 폴더 준비

배포 전용 계정 `devcookie`를 만들고 `/srv/devcookie`에서 돌립니다.

```bash
sudo useradd -m -s /bin/bash -G docker devcookie
sudo mkdir -p /srv/devcookie && sudo chown devcookie: /srv/devcookie
sudo -u devcookie git clone --branch master https://github.com/AnChanUng/mycookie.git /srv/devcookie/app

sudo -u devcookie cp /srv/devcookie/app/deploy/homeserver/.env.example /srv/devcookie/.env
sudo chmod 600 /srv/devcookie/.env
sudo -u devcookie nano /srv/devcookie/.env
```

`.env`에 넣는 값:

| 키 | 값 |
| --- | --- |
| `POSTGRES_PASSWORD` · `PROD_DB_PASSWORD` · `STAGING_DB_PASSWORD` | 각각 `openssl rand -hex 24`로 만든 값(서로 다르게, 영문 · 숫자만) |
| `PROD_ADMIN_KEY` / `STAGING_ADMIN_KEY` | Render에 쓰던 값을 그대로 쓰거나 `openssl rand -hex 24`로 새로 만든 값(서로 다르게) |
| `SWAGGER_USER` · `PROD_SWAGGER_PASSWORD` / `STAGING_SWAGGER_PASSWORD` | API 문서(`/api/docs`)를 여는 아이디(기본 `mycookie`)와 비밀번호(`openssl rand -hex 16`). 비밀번호를 비우면 문서는 404로 닫혀 있습니다 |
| `TUNNEL_TOKEN` | 6번에서 받는 토큰 |
| `BACKUP_COPY_DIR` | 외장 디스크 마운트 경로(예: `/mnt/backup/devcookie`). 비우면 노트북 안에만 백업 |
| `NEON_PROD_URL` · `NEON_STAGING_URL` | 8번에서 데이터를 옮길 때만 Neon 연결 문자열을 넣고, 옮긴 뒤 지웁니다 |
| `MAIL_HOST` 외 `MAIL_*` | 메일을 보낼 SMTP 서버. 비우면 이메일 등록, 비밀번호 찾기, 학습 메일만 꺼집니다 |
| `NEWS_ENABLED` · `NEWS_CRON` | 기업 소식(`/news`). 대기업 기술 블로그와 뉴스룸 RSS를 일주일에 한 번(기본 월요일 오전 7시) 모읍니다. 비우면 켜짐, `false`면 외부 요청을 하지 않습니다. 소스 목록은 `backend/.../news/NewsSources.java` |

## 6. Cloudflare Tunnel

1. Cloudflare 대시보드 → **Zero Trust** → **Networks → Tunnels** → **Create a tunnel** → **Cloudflared**, 이름 `devcookie`.
2. 설치 명령 화면에 나오는 `--token` 뒤의 긴 값을 복사해 `.env`의 `TUNNEL_TOKEN`에 넣습니다(설치 명령 자체는 실행하지 않습니다. compose가 cloudflared를 띄웁니다).
3. **Public Hostnames**에 두 개를 추가합니다(화면 서버가 `/api/`를 백엔드로 넘기므로 백엔드는 따로 열지 않습니다).

| Subdomain | Domain | Service |
| --- | --- | --- |
| (비움) | `mycookie.dev` | `HTTP` · `frontend-prod:80` |
| `staging` | `mycookie.dev` | `HTTP` · `frontend-staging:80` |

DNS 레코드와 HTTPS 인증서는 Cloudflare가 알아서 만듭니다. 기존 Vercel용 A · CNAME 레코드가 있으면 터널이 만든 레코드로 바뀝니다(8번 전환 때 진행).
`www.mycookie.dev`도 쓰려면 Cloudflare **Rules → Redirect Rules**에서 `www` → `https://mycookie.dev` 308 이동을 만듭니다.

## 7. 첫 배포와 자동 배포

```bash
# 첫 실행: PostgreSQL을 띄워 운영 · 스테이징 DB를 만들고, 백엔드 · 화면 이미지 4개를 빌드해서(15분 안팎) 띄운다
sudo -u devcookie /srv/devcookie/app/deploy/homeserver/deploy.sh

# 5분마다 master · dev에 새 커밋이 있는지 보고 바뀐 쪽만 다시 배포
# 매일 새벽 4시 DB 백업
# 1분마다 상태 확인: 3분 넘게 응답이 없으면 Mattermost 긴급 알림(Gemini 요약), 되살아나면 복구 알림
sudo cp /srv/devcookie/app/deploy/homeserver/systemd/devcookie-*.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now devcookie-deploy.timer devcookie-backup.timer devcookie-health.timer
```

확인:

```bash
docker ps                                                   # 8개 컨테이너가 Up (healthy)
curl -s https://staging.mycookie.dev/api/v1/categories | head -c 200
sudo -u devcookie /srv/devcookie/app/deploy/homeserver/backup.sh   # 백업이 만들어지는지 한 번 확인
```

## 8. 데이터 옮기기와 전환 (스테이징으로 며칠 확인한 뒤에)

1. **스테이징 먼저:** `.env`에 `NEON_STAGING_URL`을 넣고 옮긴 뒤 `https://staging.mycookie.dev`에서 로그인 · 학습 기록을 확인합니다.
   ```bash
   sudo -u devcookie /srv/devcookie/app/deploy/homeserver/migrate-from-neon.sh staging
   ```
2. **운영 옮기기:** 사람이 적은 시간에 `NEON_PROD_URL`을 넣고 옮깁니다. 옮기는 동안 Render 운영 백엔드에 새로 쌓인 기록은 따라오지 않으므로, 옮기기 직전에 Vercel 사이트에 점검 안내를 띄우거나(`frontend/src/maintenance.js`) 바로 4번으로 넘어갑니다.
   ```bash
   sudo -u devcookie /srv/devcookie/app/deploy/homeserver/migrate-from-neon.sh prod
   ```
3. **확인:** 터널 Public Hostname의 `mycookie.dev`가 `frontend-prod:80`을 가리키는지 보고, 브라우저에서 로그인 · 문제 풀이 · 채팅을 확인합니다.
4. **주소 전환:** Cloudflare DNS에서 `mycookie.dev`가 터널을 가리키게 합니다(터널 Public Hostname을 저장하면 자동). 몇 분 안에 노트북으로 들어옵니다.
5. **소셜 로그인:** 구글 · 카카오 · 깃허브 콘솔의 리디렉션 주소는 `https://mycookie.dev/auth/callback` 그대로입니다. 스테이징을 쓰려면 `https://staging.mycookie.dev/auth/callback`을 추가합니다.
6. **정리(일주일쯤 문제없으면):** `.env`의 `NEON_*` 줄 삭제, Render 백엔드 두 개와 Vercel 프로젝트 Suspend, Neon 프로젝트는 마지막 덤프를 받아 둔 뒤 삭제. [`keep-backend-awake.yml`](../.github/workflows/keep-backend-awake.yml)과 [`render.yaml`](../render.yaml)을 지우고 [staging.md](staging.md)를 고칩니다.

되돌리기: 4번 전에는 아무것도 바뀌지 않습니다. 4번 뒤에 문제가 생기면 Cloudflare DNS를 Vercel 레코드로 되돌리면 됩니다(그동안 노트북 DB에 쌓인 기록은 Neon에 없습니다).

## 백업과 복구

- `backup.sh`가 매일 새벽 4시 운영 · 스테이징 DB를 `/srv/devcookie/backups`에 덤프하고 14일치를 남깁니다. `BACKUP_COPY_DIR`이 있으면 같은 파일을 외장 디스크에도 복사합니다.
- **집 밖 사본(구글 드라이브):** `sudo .../setup-offsite-backup.sh`를 한 번 실행하면, 매일 백업을 비밀번호로 암호화(gpg, AES-256)해서 구글 드라이브 `mycookie-backups` 폴더에 올리고 30일치만 남깁니다. 비밀번호는 `/srv/devcookie/.backup-passphrase`에 있고, **따로 적어 두지 않으면 그램이 고장 났을 때 클라우드 백업을 열 수 없습니다.**
  - 클라우드에서 되살리기: `rclone copy gdrive:mycookie-backups/<파일>.gpg .` → `gpg -d <파일>.gpg > <파일>` (비밀번호 입력) → `restore.sh`
- 되살리기: `restore.sh /srv/devcookie/backups/cookie_prod-<날짜>.dump cookie_prod`
- **되살리기 시험(한 달에 한 번):** `sudo -u devcookie .../restore-test.sh` → 구글 드라이브의 최신 운영 백업을 받아 풀고 스테이징 DB에 되살린 뒤 회원 수를 보여 줍니다. 운영 DB는 건드리지 않습니다. (그 백엔드를 잠깐 멈추고 덤프 내용으로 바꿉니다)
- 노트북을 새로 설치할 때: 이 문서대로 다시 설치 → `deploy.sh`로 빈 DB를 만든 뒤 외장 디스크의 최신 덤프로 `restore.sh`.

## 운영

| 할 일 | 명령 |
| --- | --- |
| 로그 보기 | `docker logs -f --tail 200 devcookie-backend-prod-1` (화면: `devcookie-frontend-prod-1`, DB: `devcookie-postgres-1`) |
| DB 접속 | `docker exec -it devcookie-postgres-1 psql -U postgres -d cookie_prod` |
| 컨테이너 다루기 | `deploy/homeserver/compose.sh ps` · `compose.sh restart backend-prod` · `compose.sh logs -f backend-prod` |
| 백업 기록 | `journalctl -u devcookie-backup -n 20` |
| 배포 기록 | `journalctl -u devcookie-deploy -n 50` |
| 바로 다시 배포 | `sudo -u devcookie /srv/devcookie/app/deploy/homeserver/deploy.sh --force` |
| 메모리 · CPU | `docker stats --no-stream` |
| 되돌리기 | 문제 커밋을 `master`에서 revert하면 5분 안에 이전 코드로 다시 배포 |

- 빌드가 실패하면 `deploy.sh`가 멈추고 돌던 컨테이너는 이전 이미지로 계속 돕니다.
- 재부팅하면 Docker가 컨테이너를 다시 올리고(`restart: unless-stopped`), 타이머가 2분 뒤 배포를 확인합니다.
- DB도 노트북에 있으므로 **외장 디스크 백업이 유일한 안전장치**입니다. 한 달에 한 번 `restore.sh`로 스테이징에 되살려 백업이 정말 쓸 수 있는지 확인합니다.
- 정전 · 공유기 재부팅 · 노트북 고장 동안은 사이트가 멈춥니다. 집 인터넷 업로드 속도와 통신사 약관(가정용 회선의 서버 운영 제한)도 한 번 확인해 두세요.
- RAG 스택(ChromaDB · 임베딩 · 재정렬 모델)은 RAM 8GB에서 백엔드 두 개와 함께 돌리기 어려워 넣지 않았습니다.

## 관리자 계정과 권한

비공개 페이지는 로그인한 계정의 권한으로 막습니다(주소를 숨기는 방식이 아님).

| 권한 | 들어갈 수 있는 곳 | 줄 계정 |
| --- | --- | --- |
| `ADMIN` | `/admin` 관리자 모니터링, 관리자 API | admin1, admin2 |
| `OWNER` | `/private/chanung` 찬웅 전용 페이지 | 찬웅 계정 |
| `TEAM` | `/private/bomin` 온보딩, 개발 일지 | 보민, 찬웅, admin1, admin2 |

- `admin`, `관리자`, `운영자`로 시작하는 닉네임은 일반 가입과 닉네임 변경에서 막혀 있어, 다른 사람이 먼저 가져갈 수 없습니다.
- 관리자 계정 생성과 권한 부여는 **홈서버의 관리자 키로만** 됩니다(인터넷 쪽 화면에는 없음). 관리자 비밀번호는 아이디와 같거나 아이디를 포함하면 안 됩니다.

```bash
cd /srv/devcookie/app/deploy/homeserver
sudo ./account.sh create admin1 ADMIN,TEAM   # 비밀번호는 화면에 안 보이게 두 번 입력
sudo ./account.sh create admin2 ADMIN,TEAM
sudo ./account.sh grant <찬웅 닉네임> OWNER
sudo ./account.sh grant <찬웅 닉네임> TEAM
sudo ./account.sh grant <보민 닉네임> TEAM
sudo ./account.sh list                       # 확인
sudo ./account.sh --staging create admin1 ADMIN,TEAM   # 스테이징은 DB와 계정이 따로라 따로 만든다
```

## 로그 보기

운영, 스테이징 로그는 Grafana에서 봅니다. 띄우는 법과 접속, 계정은 [monitoring.md](monitoring.md)를 참고하세요.

## 등급별 테스트 계정

`admin1~admin5`는 각각 동, 은, 금, 다이아, 루비 등급의 테스트 계정입니다.
관리자와 TEAM 권한은 admin1, admin2에게만 부여합니다. 다섯 테스트 계정과 ADMIN 권한 계정은 순위에서 제외합니다.

홈서버에서 아래 명령을 실행하면 각 계정 비밀번호를 화면에 보이지 않게 두 번 입력받습니다.
이미 존재하는 계정은 덮어쓰지 않습니다.

```bash
cd /srv/devcookie/app/deploy/homeserver
sudo ./account.sh test-account admin1
sudo ./account.sh test-account admin2
sudo ./account.sh test-account admin3
sudo ./account.sh test-account admin4
sudo ./account.sh test-account admin5
sudo ./account.sh list
```

기존 계정의 비밀번호는 유지하고 테스트 등급과 권한만 맞추려면 `sudo ./account.sh test-profile admin1`처럼 실행합니다.
이 명령은 지정한 테스트 계정의 권한을 위 기준으로 맞춥니다. admin3~admin5에 붙었던 ADMIN·TEAM·OWNER 권한도 제거합니다.
스테이징 DB에는 `sudo ./account.sh --staging test-account admin1`처럼 별도로 생성합니다.
다섯 계정의 표시 등급은 테스트용으로 고정됩니다. 학습 기록과 기존 승급 이력은 삭제하지 않습니다. 닉네임 변경도 막아 테스트 계정을 계속 식별합니다.
