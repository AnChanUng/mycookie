# 노트북 홈서버

Render 무료 백엔드(운영 · 스테이징)를 노트북 한 대로 옮깁니다. 잠들지 않고 월 750시간 제한도 없어집니다.

| 구분 | 지금 | 홈서버 |
| --- | --- | --- |
| 프론트엔드 | Vercel | Vercel (그대로) |
| 운영 백엔드 (`master`) | Render `cs-study-backend` | 노트북 `backend-prod` → `https://api.<도메인>` |
| 스테이징 백엔드 (`dev`) | Render `cs-study-backend-staging` | 노트북 `backend-staging` → `https://api-staging.<도메인>` |
| DB | Neon main · staging | Neon main · staging (그대로) |
| 외부 노출 | Render | Cloudflare Tunnel (공유기 포트 개방 없음) |
| 배포 | Render 자동 배포 | `deploy.sh`가 5분마다 브랜치를 확인해서 바뀐 서버만 다시 빌드 |

파일은 [`deploy/homeserver/`](../deploy/homeserver)에 있습니다.

```
요청 → Cloudflare(HTTPS) ⇄ cloudflared(노트북이 바깥으로 연결) → backend-prod / backend-staging → Neon
```

노트북의 포트는 하나도 열지 않습니다. cloudflared가 노트북에서 Cloudflare로 바깥 연결을 만들고, 요청은 그 연결로만 들어옵니다.

## 준비물

- 8GB 이상 USB (설치 후 다시 써도 됨)
- **Cloudflare에 연결된 도메인** 하나. 없으면 Cloudflare Registrar나 가비아 등에서 사서 네임서버를 Cloudflare로 바꿉니다(.com 기준 연 1~2만 원).
- 노트북 안의 자료 백업. **설치하면 디스크가 전부 지워집니다.**

## 1. Ubuntu Server 설치

1. [Ubuntu Server 24.04 LTS](https://ubuntu.com/download/server) ISO를 받아 [Rufus](https://rufus.ie)로 USB에 굽습니다.
2. 노트북을 껐다 켜며 부팅 메뉴 키(F12 · F9 · Esc 등 제조사마다 다름)로 USB 부팅합니다. 안 되면 BIOS에서 Secure Boot를 끕니다.
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
sudo -u devcookie git clone --branch master https://github.com/AnChanUng/DevCookie.git /srv/devcookie/app

sudo -u devcookie cp /srv/devcookie/app/deploy/homeserver/.env.example /srv/devcookie/.env
sudo chmod 600 /srv/devcookie/.env
sudo -u devcookie nano /srv/devcookie/.env
```

`.env`에 넣는 값:

| 키 | 값 |
| --- | --- |
| `PROD_DATABASE_URL` | Render `cs-study-backend`에 넣어 둔 Neon **main** 연결 문자열 |
| `STAGING_DATABASE_URL` | Render 스테이징에 넣어 둔 Neon **staging** 연결 문자열 |
| `PROD_ADMIN_KEY` / `STAGING_ADMIN_KEY` | Render에 쓰던 값을 그대로 쓰거나 `openssl rand -hex 24`로 새로 만든 값(서로 다르게) |
| `TUNNEL_TOKEN` | 6번에서 받는 토큰 |

## 6. Cloudflare Tunnel

1. Cloudflare 대시보드 → **Zero Trust** → **Networks → Tunnels** → **Create a tunnel** → **Cloudflared**, 이름 `devcookie`.
2. 설치 명령 화면에 나오는 `--token` 뒤의 긴 값을 복사해 `.env`의 `TUNNEL_TOKEN`에 넣습니다(설치 명령 자체는 실행하지 않습니다. compose가 cloudflared를 띄웁니다).
3. **Public Hostnames**에 두 개를 추가합니다.

| Subdomain | Domain | Service |
| --- | --- | --- |
| `api` | `<도메인>` | `HTTP` · `backend-prod:8080` |
| `api-staging` | `<도메인>` | `HTTP` · `backend-staging:8080` |

DNS 레코드와 HTTPS 인증서는 Cloudflare가 알아서 만듭니다.

## 7. 첫 배포와 자동 배포

```bash
# 첫 실행: 두 이미지를 빌드하고(10분 안팎) 세 컨테이너를 띄운다
sudo -u devcookie /srv/devcookie/app/deploy/homeserver/deploy.sh

# 5분마다 master · dev에 새 커밋이 있는지 보고 바뀐 쪽만 다시 배포
sudo cp /srv/devcookie/app/deploy/homeserver/systemd/devcookie-deploy.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now devcookie-deploy.timer
```

확인:

```bash
docker ps                                   # 세 컨테이너가 Up (healthy)
curl -s https://api.<도메인>/api/v1/categories | head -c 200
curl -s https://api-staging.<도메인>/api/v1/categories | head -c 200
```

## 8. 전환 (홈서버가 잘 도는 것을 며칠 본 뒤에)

1. 스테이징 먼저: Vercel → Settings → Environment Variables의 `VITE_STAGING_API_URL`(Preview)을 `https://api-staging.<도메인>/api/v1`로 바꾸고 `dev` 미리보기를 다시 배포합니다.
2. 운영: [`frontend/src/api.js`](../frontend/src/api.js)의 `BACKEND`를 `https://api.<도메인>/api/v1`로 바꾸는 PR을 `dev` → `master`로 배포합니다.
3. 정리: [`keep-backend-awake.yml`](../.github/workflows/keep-backend-awake.yml) 워크플로를 지우고, Render 백엔드 두 개를 Suspend했다가 문제가 없으면 삭제합니다. [`render.yaml`](../render.yaml)과 [staging.md](staging.md)의 Render 설명도 함께 고칩니다.

CORS 허용 주소는 프론트엔드(Vercel) 기준이라 백엔드 주소가 바뀌어도 그대로 둡니다.

## 운영

| 할 일 | 명령 |
| --- | --- |
| 로그 보기 | `docker logs -f --tail 200 devcookie-backend-prod-1` |
| 배포 기록 | `journalctl -u devcookie-deploy -n 50` |
| 바로 다시 배포 | `sudo -u devcookie /srv/devcookie/app/deploy/homeserver/deploy.sh --force` |
| 메모리 · CPU | `docker stats --no-stream` |
| 되돌리기 | 문제 커밋을 `master`에서 revert하면 5분 안에 이전 코드로 다시 배포 |

- 빌드가 실패하면 `deploy.sh`가 멈추고 돌던 컨테이너는 이전 이미지로 계속 돕니다.
- 재부팅하면 Docker가 컨테이너를 다시 올리고(`restart: unless-stopped`), 타이머가 2분 뒤 배포를 확인합니다.
- DB는 Neon에 그대로 있으므로 노트북이 망가져도 데이터는 남습니다. 다시 설치하고 이 문서대로 하면 복구됩니다.
- 정전 · 공유기 재부팅 · 노트북 고장 동안은 사이트가 멈춥니다. 집 인터넷 업로드 속도와 통신사 약관(가정용 회선의 서버 운영 제한)도 한 번 확인해 두세요.
- RAG 스택(ChromaDB · 임베딩 · 재정렬 모델)은 RAM 8GB에서 백엔드 두 개와 함께 돌리기 어려워 넣지 않았습니다.
