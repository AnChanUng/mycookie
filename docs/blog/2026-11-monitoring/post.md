# 나의쿠키 홈서버의 로그와 지표는 어떻게 모이는가

2026-11-20, dev의 모니터링 설정을 읽으며 정리한 학습 초안입니다.
구성 파일과 실제 서버의 실행 상태는 각각 확인해야 합니다.
이 글에서는 저장소의 구성을 설명하고, 실행 여부를 확인하는 순서도 함께 적습니다.

## 오류가 발생했을 때 확인할 정보

로그에는 요청 실패와 예외처럼 특정 시점에 일어난 사건이 담깁니다.
지표에는 CPU, 메모리, 디스크 사용량처럼 시간에 따라 바뀌는 수치가 쌓입니다.
오류가 발생한 시각의 로그와 자원 사용량을 함께 보면 원인을 좁힐 수 있습니다.

## 현재 수집 경로

~~~text
서비스 컨테이너 로그 → Alloy → Loki → Grafana의 MyCookie Logs
서버 지표 → Alloy의 Unix exporter → Prometheus → Grafana의 MyCookie Server
컨테이너 지표 → stats 수집기 → Alloy → Prometheus → Grafana
~~~

Alloy의 Docker discovery는 Compose 프로젝트가 devcookie인 컨테이너를 찾습니다.
backend-prod와 backend-staging은 service=backend로 묶고 environment 값으로 구분합니다.
공유 PostgreSQL·Redis·Kafka 등은 environment=shared로 표시합니다.
Loki는 이 라벨과 로그를 보관하고, Grafana는 Loki에 질의해 로그를 보여 줍니다.

Alloy의 Unix exporter가 서버 지표를 제공합니다.
컨테이너 지표는 저장소의 docker_stats_exporter.py가 Docker API에서 읽습니다.
Alloy가 수집한 지표는 Prometheus로 전송됩니다.
Grafana는 Prometheus를 조회해 시간별 그래프를 만듭니다.

## 설정을 읽는 순서

1. deploy/monitoring/docker-compose.yml에서 각 컨테이너의 역할, 볼륨, 메모리 한도를 봅니다.
2. config.alloy에서 Docker discovery, 라벨, 개인정보 가림과 수집 대상을 따라갑니다.
3. prometheus.yml과 loki.yaml에서 저장 구성을 확인합니다.
4. grafana/provisioning과 grafana/dashboards에서 데이터 소스와 화면 쿼리를 연결합니다.

현재 설정의 로그 보관 기간은 14일, 지표는 7일이며 Prometheus 저장량 상한은 2GB입니다.
모니터링 컨테이너의 메모리 한도 합계는 약 1.2GB입니다.
실제 사용량은 Grafana와 Docker에서 확인합니다.

## 로그의 개인정보 처리

config.alloy의 stage.replace에서 이메일, IP, 토큰과 비밀번호 형태를 가립니다.
처리된 로그가 Loki에 저장됩니다.
정규식은 코드에 있는 패턴을 대상으로 작동하므로 애플리케이션에서도 비밀값을 로그에 기록하지 않아야 합니다.

## 장애 알림에서 원인 조사까지

CriticalErrorAlerts가 치명 오류와 ERROR 급증을 감지합니다.
홈서버 healthcheck.py는 서비스가 응답하는지 별도로 확인합니다.
알림을 받으면 발생 시각을 기준으로 Grafana의 로그와 지표를 조회합니다.
현재 구성에서는 Grafana의 별도 알림 기능을 켜지 않습니다.

예를 들어 DB 연결 오류 알림을 받았다면 다음 순서로 봅니다.

1. MyCookie Logs에서 환경 prod, 서비스 backend, 레벨 ERROR와 알림 시각을 고릅니다.
2. 같은 시간의 shared / postgres 로그를 확인합니다.
3. MyCookie Server에서 메모리와 디스크 사용량을 확인합니다.
4. 확인한 로그와 수치를 바탕으로 연결 설정, 자원 부족, DB 상태 중 어느 쪽을 더 조사할지 정합니다.

## 실제로 가동 중인지 확인하기

홈서버에서 아래 조회 명령으로 컨테이너 상태와 Grafana 응답을 확인합니다.
Docker 프로젝트 이름은 docker-compose.yml의 name과 일치해야 합니다.

~~~bash
docker ps --filter label=com.docker.compose.project=mycookie-monitoring --format 'table {{.Names}}\t{{.Status}}'
curl --fail http://127.0.0.1:3000/api/health
~~~

이어서 Grafana에 로그인해 최근 15분의 로그와 지표가 갱신되는지 확인합니다.
컨테이너가 실행 중이어도 수집이나 데이터 소스 연결이 실패하면 그래프가 비어 있을 수 있습니다.
이 글 작성 과정에서는 홈서버에 접속해 위 검증을 실행하지 않았습니다.

## 보민님이 매일 확인할 항목

- 최근 오류 알림이 있었는지와 해당 시각의 로그를 확인합니다.
- CPU·메모리·디스크 그래프와 수집 시각을 확인합니다.
- 메일 발송이 실패했다면 발송 시각의 백엔드 로그를 찾아 봅니다.
- 이상이 있으면 재현 방법과 관찰한 값을 이슈에 남기고 관련 수정은 같은 PR에서 관리합니다.

조회에는 Grafana Viewer 계정을 사용하고, 수집 설정을 고칠 때는 운영 담당자와 변경 범위를 확인합니다.
블로그에 게시할 때 예시 화면은 실제 사용자 정보와 내부 접속 주소를 가린 뒤 사용합니다.

## 다시 설명해 볼 질문

- 로그와 지표를 각각 어떤 상황에서 확인하는가?
- Alloy가 멈추면 Grafana에는 어떤 증상이 나타나는가?
- 컨테이너가 실행 중인데 그래프가 비어 있다면 어디부터 확인할까?
- prod와 staging을 어떤 라벨로 구분하는가?
- 장애 알림을 받은 뒤 어떤 근거로 원인을 좁힐까?

구체적인 실행·접속 방법은 [모니터링 운영 안내](../../monitoring.md)에 정리되어 있습니다.
