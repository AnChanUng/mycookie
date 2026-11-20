# 홈서버 k6 부하테스트

로컬 측정([README.md](README.md))은 개발 머신의 Spring Boot만 잰다. 이 문서는 **홈서버(그램 노트북) 실제 구성**을 잽니다. 요청은 nginx(화면 서버) → 백엔드 → PostgreSQL, Redis를 그대로 지나가고, 메모리 8GB 안에서 다른 컨테이너와 함께 돌 때의 숫자가 나와요.

스크립트는 [homeserver.js](homeserver.js)입니다.

| 지켜지는 것 | 방법 |
| --- | --- |
| 기본 대상은 스테이징 | `BASE_URL` 기본값이 `http://127.0.0.1:8081`(스테이징 화면 서버) |
| 운영은 일부러 열어야만 | 8080은 `CONFIRM_PROD=yes`가 없으면 시작 전에 멈춤 |
| 데이터를 바꾸지 않음 | 읽기(GET) 요청만 보냄. 방문 기록, 풀이 기록, 채팅 쓰기 없음 |
| 바깥에서 보내지 않음 | 루프백 주소만 허용. 터널(인터넷)을 거치지 않음 |
| 요청 제한 설정 그대로 | VU마다 다른 `X-Forwarded-For`(시험용 대역 198.18.0.0/15)로 사용자를 나눔 |

> 요청 제한은 IP별(문제 조회 분당 180회)입니다. 모든 VU가 같은 루프백에서 나가면 진짜 처리 능력보다 제한에 먼저 걸려요. 그래서 VU마다 가짜 주소를 붙입니다. 인터넷 요청은 Cloudflare가 실제 IP를 맨 뒤에 붙이고 백엔드는 그 마지막 값을 쓰므로, 바깥에서 이 헤더로 제한을 피할 수는 없습니다.

## 1. k6 설치(홈서버, 한 번만)

```bash
cd /tmp
curl -fLO https://github.com/grafana/k6/releases/download/v1.3.0/k6-v1.3.0-linux-amd64.tar.gz
tar xzf k6-v1.3.0-linux-amd64.tar.gz && sudo mv k6-v1.3.0-linux-amd64/k6 /usr/local/bin/
k6 version   # k6 v1.3.0
```

## 2. 측정 전 확인

```bash
cd /srv/devcookie/staging                                # dev를 따라가는 작업 폴더
sudo /srv/devcookie/app/deploy/homeserver/compose.sh ps   # backend-staging, frontend-staging Up
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081/api/v1/categories   # 200
```

- 배포 타이머가 측정 중에 컨테이너를 다시 띄우지 않게, 5분 배포 주기 사이(방금 배포가 끝난 직후)에 시작하세요.
- 같은 노트북에서 k6도 CPU를 씁니다. 결과에 "k6와 서버가 같은 머신"이라고 함께 적어요.

## 3. 실행

```bash
mkdir -p load-tests/results
k6 run -e PROFILE=smoke  load-tests/homeserver.js    # 1 VU 3회. 응답 모양만 확인(10초)
k6 run -e PROFILE=load   load-tests/homeserver.js    # 10 → 30 → 50 VU, 50 VU 1분 유지(약 3분)
k6 run -e PROFILE=stress load-tests/homeserver.js    # 50 → 100 → 150 → 200 VU(약 4분)
```

| 실행 | 목적 | 판정 |
| --- | --- | --- |
| smoke | 스크립트와 서버가 맞는지 | 실패 0 |
| load | 평소보다 넉넉한 부하에서 기준 통과 | 실패율 1% 미만, p95 500ms 미만, p99 1초 미만, API별 p95 500ms 미만, 429와 5xx 0건 |
| stress | 어디서 꺾이는지 찾기 | 기준 없음. 실패율 5%를 넘으면 스스로 멈춤 |

그래프 보고서도 남기려면 앞에 붙입니다.

```bash
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=load-tests/results/homeserver-load.html \
  k6 run -e PROFILE=load load-tests/homeserver.js
```

요약 JSON은 `load-tests/results/homeserver-<프로필>.json`에 저장됩니다(이 폴더는 커밋하지 않음).

## 4. 같이 볼 것: 서버 쪽 숫자

k6는 "사용자가 느끼는 시간"만 봅니다. 왜 느려졌는지는 서버 쪽을 같이 봐야 알 수 있어요.

- **Grafana**(grafana.mycookie.dev): 측정 시작, 끝 시각을 적어 두고 그 구간의 CPU, 메모리, 백엔드 오류 로그를 봅니다.
- **컨테이너 메모리**: 다른 터미널에서 측정 내내 띄워 둡니다.

```bash
docker stats --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' \
  devcookie-backend-staging-1 devcookie-postgres-1 devcookie-redis-1 devcookie-frontend-staging-1
```

stress에서 볼 것:

1. p95가 갑자기 뛰는 VU 수(꺾이는 지점)
2. 그때 backend-staging 메모리가 `mem_limit`(768m)에 붙는지, CPU가 100%인지
3. 실패가 429인지(요청 제한), 5xx나 연결 실패인지(서버 한계)

## 5. 결과 적기

`reports/YYYY-MM-DD-homeserver.md`로 남기고, 아래 표를 채웁니다. 이 숫자가 포트폴리오의 빈칸(⬜)에 들어가요.

| 항목 | load | stress |
| --- | ---: | ---: |
| 최대 VU | 50 | |
| 총 요청 | | |
| 평균 처리량(요청/초) | | |
| p95 / p99 | | |
| 가장 느린 API와 p95 | | |
| 실패율, 429, 5xx | | |
| 꺾이는 VU 수 | 해당 없음 | |
| 그때 백엔드 CPU, 메모리 | | |

함께 적을 조건: 측정 날짜, 대상(스테이징), 커밋, 노트북 사양(메모리 8GB), 백엔드 `mem_limit`, k6와 서버가 같은 머신이라는 점.

### 해석할 때

- VU는 동시에 계속 누르는 가상 사용자입니다. 한 VU가 1초에 약 7건을 보내므로 50 VU는 실제 동시 접속자 수백 명보다 무거운 부하예요. 그래도 "동시 접속 50명 보장"이나 DAU로 바꿔 말하지 않습니다.
- 스테이징은 운영보다 데이터가 적을 수 있어요. 순위, 공개 통계처럼 쌓인 기록을 모으는 API는 운영에서 더 느릴 수 있습니다.

## 스크립트 자체 확인(2026-11-20)

클라우드 개발 컨테이너의 `loadtest` 프로필(요청 제한 켜짐, `trust-forwarded-for=true`로 홈서버와 같게)에 대고 돌려 스크립트가 맞게 동작하는지만 확인했습니다. 홈서버 숫자가 아니므로 포트폴리오에 쓰지 않아요.

| 실행 | 결과 |
| --- | --- |
| smoke | 23건, 실패 0, 판정 통과 |
| load(50 VU) | 37,186건, 실패 0, 429 0건, 5xx 0건, 판정 모두 통과 |

요청 제한을 켠 채로 50 VU에서 429가 0건이었으니, VU별 주소 나누기가 의도대로 동작합니다.
