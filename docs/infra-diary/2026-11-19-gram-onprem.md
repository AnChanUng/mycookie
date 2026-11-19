# 인프라 일기 · 2026-11-19 · LG 그램 노트북을 온프레미스 서버로

> 캡처는 `docs/infra-diary/images/2026-11-19-gram-onprem/`에 로컬로만 보관합니다(계정 정보가 보여 저장소에 올리지 않음).
> 비밀번호 · 연결 문자열 · 토큰은 이 문서에 적지 않습니다.

## 목표
Vercel(화면) · Render(백엔드) · Neon(DB)에 나눠 있던 나의쿠키를 집에 있는 LG 그램 노트북(RAM 8GB) 한 대로 옮긴다.

```
방문자 → Cloudflare(HTTPS) → cloudflared → nginx ─┬─ 화면(dist)
                                                  └─ /api/ → Spring Boot → PostgreSQL 18
```

순서: **서버 구축 → DB 이관 → 내 서버에서 서비스**

---

## 1. OS 고르기: Ubuntu Server vs Windows + WSL2

| | Ubuntu Server 설치 | Windows 그대로 + WSL2 |
| --- | --- | --- |
| 기존 데이터 | 전부 지워짐 | 그대로 |
| 준비물 | 설치 USB | 없음 |
| 메모리 | OS가 1GB 미만 | Windows가 3~4GB 사용 |
| 24시간 운영 | 안정적 | 업데이트 재부팅 · 절전 관리 필요 |

- 처음엔 Ubuntu Server 24.04 LTS를 추천했다. 하지만 가진 USB가 빌린 것 하나뿐이었고(설치 USB를 만들면 통째로 포맷됨), 그램의 데이터도 정리되지 않은 상태였다.
- **결정: Windows + WSL2로 먼저 시작.** 서버 전용으로 굳히면 그때 Ubuntu로 옮기고, DB 덤프만 가져가면 된다.
- 헷갈렸던 점: "Windows + 리눅스"는 듀얼 부팅이 아니라 WSL2(Windows 안에서 리눅스가 같이 도는 것). 듀얼 부팅은 리눅스로 켜져 있을 때만 사이트가 돌아 서버 용도에 맞지 않는다.

## 2. WSL2 · Docker 설치

```powershell
wsl --install -d Ubuntu-24.04   # 관리자 PowerShell, 재부팅 후 리눅스 계정(cookie) 생성
```

### 문제 1: `docker` 그룹이 없다
- `curl -fsSL https://get.docker.com | sudo sh`가 WSL을 감지하고 Docker Desktop을 권하며 멈춰서, 설치가 끝나지 않은 상태였다.
- `usermod: group 'docker' does not exist`, `Command 'docker' not found`
- **해결:** Ubuntu 공식 패키지로 설치
  ```bash
  sudo apt install -y docker.io docker-compose-v2 docker-buildx
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER
  ```

### 문제 2: `permission denied ... docker.sock`
- 그룹에 넣은 뒤 다시 로그인하지 않아서. `newgrp docker` 또는 Ubuntu 창을 닫았다 열면 해결.

### 메모리
- WSL은 기본으로 RAM의 절반(약 4GB)만 쓴다. 백엔드 2개 + DB + nginx에는 부족.
- `C:\Users\cookie\.wslconfig`
  ```ini
  [wsl2]
  memory=6GB
  swap=4GB
  ```
- 메모장으로 저장할 때 `.wslconfig.txt`가 되지 않게 "모든 파일"로 저장. `wsl --shutdown`은 **PowerShell**에서(리눅스 창이 아니다). `free -h`에서 5.8Gi 확인.

## 3. 배포 계정 · 비공개 저장소

- 사이트는 전용 계정 `devcookie`로, 폴더는 `/srv/devcookie`.
- 저장소가 비공개라 HTTPS 클론이 안 된다 → 그램 전용 **읽기 전용 Deploy key**(ed25519)를 만들어 GitHub 저장소 Settings → Deploy keys에 등록(Allow write access 체크 안 함).
- `ssh -T git@github.com` → `Hi AnChanUng/mycookie! You've successfully authenticated` 확인.

### 문제 3: `stat .: permission denied`
- `cookie`의 집 폴더(`/home/cookie`)에서 `sudo -u devcookie deploy.sh`를 실행하면, `devcookie`가 현재 폴더에 들어갈 권한이 없어 docker compose가 실패.
- **해결:** 스크립트 맨 앞에서 `cd /srv/devcookie`.

## 4. 첫 배포

- 비밀번호는 사람이 만들지 않고 `openssl rand -hex 24`로 자동 생성해서 `.env`에 넣었다(영문 · 숫자만: 연결 주소에 그대로 들어가므로).
- 터널 토큰이 없으면 compose가 아예 시작되지 않던 것을 고쳐, 터널 없이도 기동하고 그램 안에서만 `http://localhost:8080`(운영) · `8081`(스테이징)으로 확인할 수 있게 했다(127.0.0.1에만 바인딩).
- 핫스팟이라 용량이 걱정됐다. 첫 배포는 약 1.5~2GB. 배포마다 라이브러리를 다시 받지 않게 Dockerfile에서 의존성 층을 먼저 받도록 바꿨다.
- 결과: 컨테이너 5개(postgres, backend ×2, frontend ×2) 정상, 브라우저에서 화면 · 가입 · 로그인 확인.

## 5. 자동 시작 · 백업

- 매일 새벽 4시 `pg_dump` (systemd 타이머, 14일 보관).
- WSL은 누가 창을 열어야 켜지고 창을 다 닫으면 꺼진다 → 작업 스케줄러에 `wsl.exe -d Ubuntu-24.04 -u root --exec sleep infinity` 등록.

### 문제 4: 작업 스케줄러 "작업을 만들 수 없습니다"
- "사용자의 로그온 여부에 관계없이 실행"은 Windows 계정 비밀번호를 저장해야 하는데, PIN으로만 로그인하는 계정이라 거부됨.
- **해결:** "사용자가 로그온할 때만 실행" + 트리거 "로그온할 때". 재부팅 후 로그인이 필요하므로 공개 전에 Windows 자동 로그인(netplwiz)을 켠다.

## 6. DB 이관 (Neon → 그램)

### 문제 5: 연결 주소를 찾기
- Neon 콘솔의 Connect 버튼이 잘 안 보였다 → **Render 대시보드의 `DATABASE_URL`**(운영 백엔드가 실제로 쓰는 값)에서 복사하는 게 더 확실했다.
- Render에는 스테이징 백엔드가 실제로 없었다 → 운영 주소 하나로 **읽기만 해서** 그램의 스테이징 DB에 넣어 연습.
- `-pooler`가 붙은 주소(PgBouncer)는 `pg_dump`에 맞지 않아 `-pooler`만 지운 직접 연결 주소를 썼다.

### 사고: 연결 문자열을 채팅에 붙여 넣음
- 비밀번호가 든 주소가 대화 기록에 남았다 → 이사 뒤 Neon에서 `neondb_owner` 비밀번호를 재설정하기로 함.
- 교훈: 비밀 값은 채팅이 아니라 서버의 `.env`에 직접 넣는다. 확인이 필요하면 `grep -c`처럼 **개수만** 본다.

### 문제 6: nano에서 "Write Selection to File"
- 주소를 붙여 넣다 글자가 선택(mark)된 상태에서 Ctrl+O를 눌러, 선택한 부분만 다른 파일로 저장하려 했다.
- **해결:** Ctrl+C로 취소 → Alt+A로 선택 해제 → Ctrl+O → Enter.

### 문제 7: `pg_dump: server version: 18.7; pg_dump version: 17.12`
- Neon이 PostgreSQL 18, 그램은 17. pg_dump는 자기보다 새 서버를 덤프하지 못한다.
- **해결:** 그램 DB를 `postgres:18-alpine`으로. 18 이미지부터 데이터 위치가 `/var/lib/postgresql/18/docker`로 바뀌어 볼륨을 `/var/lib/postgresql`에 붙였다(새 폴더 `pgdata18`).
- 결과: 회원 11명 이관, 실제 계정으로 그램(`localhost:8081`)에 로그인 · 학습 기록 확인.
- 이건 **연습**이다. 실제 사이트는 계속 Neon에 쓰므로, 진짜 이관은 "마지막 복사 → 주소 전환"을 연달아 하는 날 한다.

## 7. 개발용 PC에서 원격 조작 (Tailscale)

- 그램 앞에 앉지 않고 개발용 PC에서 작업하려고 Tailscale을 WSL 안에 설치하고 `tailscale up --ssh --hostname=gram`.
- 비교: 크롬 원격 데스크톱은 화면 전체(설정 · 작업 스케줄러에 좋음, 데이터 많이 씀), Tailscale SSH는 터미널만(명령어 작업, 데이터 적음). 둘 다 쓰면 편하다.

### 문제 8: `gram`이 계속 offline
- 개발용 PC 쪽은 로그인이 안 돼 있었다(`tailscale status` → `Logged out`) → 같은 계정으로 로그인.
- 그램 쪽은 `Tailscale hasn't received a network map`, `iptables ... connmark ... missing kernel module?` → WSL 커널이 Tailscale이 쓰는 iptables 기능을 지원하지 않음.
- **해결:** 사용자 공간 네트워킹으로 전환
  ```bash
  sudo sed -i 's/^FLAGS=.*/FLAGS="--tun=userspace-networking"/' /etc/default/tailscaled
  sudo systemctl restart tailscaled
  sudo tailscale up --ssh --hostname=gram --netfilter-mode=off
  ```
- 개발용 PC에서 `ssh cookie@gram` 성공.

## 8. Cloudflare에 도메인 올리기

왜 Cloudflare인가: 그램은 집 안(지금은 휴대폰 핫스팟 뒤)에 있어 바깥에서 직접 찾아올 수 없다. 핫스팟은 통신사가 주소를 나눠 써서(CGNAT) 포트를 열 수도 없다. Cloudflare Tunnel은 그램이 먼저 바깥으로 연결을 걸어 두는 방식이라 공유기 설정 없이 내 도메인 + HTTPS + 공격 방어를 무료로 준다. 사이트 파일을 올리는 게 아니라 길만 빌린다.

1. Add a domain에 `mycookie.dev` → 01
2. AI 크롤러 정책: Search는 **Allow**(검색 노출), 나머지 기본값, Import DNS records **Automatic** → 02
3. 자동으로 읽어 온 기록: A `mycookie.dev` → 216.198.79.1(Vercel), CNAME `dev`, CNAME `www` → 03
4. 셋 다 기본으로 **Proxied**(주황 구름)였다 → Vercel과 Cloudflare가 서로 HTTPS를 처리하려다 무한 리디렉션이 날 수 있어, 이사 전까지 **DNS only**(회색)로 → 04
5. "not fully protected" 경고 → I'll do this later(일부러 회색) → 05
6. Cloudflare 네임서버 `gerald.ns.cloudflare.com`, `selah.ns.cloudflare.com`. 가비아의 `ns.gabia.co.kr`, `ns.gabia.net`, `ns1.gabia.co.kr`은 지운다 → 06

## 남은 일
- [ ] 가비아에서 네임서버를 Cloudflare 2개로 변경, DNSSEC 꺼져 있는지 확인 → Cloudflare "active" 메일
- [ ] Zero Trust → Tunnel 만들기 → 토큰을 그램 `.env`에 → `staging.mycookie.dev` → `frontend-staging:80`으로 바깥 접속 시험
- [ ] Windows 자동 로그인(netplwiz)
- [ ] **이사:** `migrate-from-neon.sh prod` → 곧바로 `mycookie.dev` → `frontend-prod:80` (Vercel A 기록 대체), www → 308
- [ ] Neon 비밀번호 재설정, 일주일 뒤 Render · Vercel · Neon 정리
- [ ] PR #75 병합 후 `.env`의 `PROD_BRANCH` · `STAGING_BRANCH`를 비워 `master`를 따라가게
- [ ] 재부팅 시험: 로그인 후 Ubuntu 창을 열지 않고 `localhost:8080`이 열리는지
- [ ] 집 인터넷(유선)으로 바꾸고 자동 배포 타이머 켜기
