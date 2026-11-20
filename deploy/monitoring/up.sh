#!/usr/bin/env bash
# 로그 모니터링을 띄운다(처음 한 번, 그리고 설정을 바꿨을 때). devcookie 서비스와는 따로 돈다.
#   sudo /srv/devcookie/app/deploy/monitoring/up.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA=/srv/mycookie-monitoring
ENV="$DATA/.env"

mkdir -p "$DATA/loki" "$DATA/grafana" "$DATA/alloy" "$DATA/prometheus"
# 컨테이너 안의 사용자(Loki 10001, Grafana 472, Prometheus 65534)가 쓸 수 있게 한다
chown -R 10001:10001 "$DATA/loki"
chown -R 472:0 "$DATA/grafana"
chown -R 65534:65534 "$DATA/prometheus"

if [ ! -f "$ENV" ]; then
  cp "$HERE/.env.example" "$ENV"
  chmod 600 "$ENV"
  # 관리자 비밀번호를 무작위로 만들어 넣는다(화면에 보여 주지 않는다. 확인: sudo grep GRAFANA_ADMIN_PASSWORD /srv/mycookie-monitoring/.env)
  sed -i "s|^GRAFANA_ADMIN_PASSWORD=.*|GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')|" "$ENV"
  echo "$ENV을 만들었습니다(관리자 비밀번호 자동 생성)."
fi

# Grafana는 사이트 네트워크(devcookie_default)의 터널로도 열리므로 사이트가 먼저 떠 있어야 한다
docker network inspect devcookie_default >/dev/null 2>&1 || { echo "사이트를 먼저 띄워 주세요: sudo /srv/devcookie/app/deploy/homeserver/compose.sh up -d"; exit 1; }
docker compose --project-directory "$HERE" -f "$HERE/docker-compose.yml" --env-file "$ENV" up -d
docker compose --project-directory "$HERE" -f "$HERE/docker-compose.yml" --env-file "$ENV" ps

# 보기 전용 팀원 계정: .env의 GRAFANA_VIEWERS="아이디:비밀번호 아이디:비밀번호"로 만든다(이미 있으면 건너뛴다)
ADMIN_USER=$(grep -E '^GRAFANA_ADMIN_USER=' "$ENV" | cut -d= -f2-); ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=$(grep -E '^GRAFANA_ADMIN_PASSWORD=' "$ENV" | cut -d= -f2-)
VIEWERS=${GRAFANA_VIEWERS:-$(grep -E '^GRAFANA_VIEWERS=' "$ENV" | cut -d= -f2- | tr -d '"')}
for i in $(seq 1 30); do curl -fs -o /dev/null http://127.0.0.1:3000/api/health && break; sleep 2; done
for pair in $VIEWERS; do
  login=${pair%%:*}; pass=${pair#*:}
  if curl -fs -o /dev/null -u "$ADMIN_USER:$ADMIN_PASS" "http://127.0.0.1:3000/api/users/lookup?loginOrEmail=$login"; then
    echo "Grafana 계정 $login: 이미 있음"
  else
    curl -fs -o /dev/null -u "$ADMIN_USER:$ADMIN_PASS" -H 'Content-Type: application/json' -X POST http://127.0.0.1:3000/api/admin/users \
      -d "{\"name\":\"$login\",\"login\":\"$login\",\"password\":\"$pass\"}" \
      && echo "Grafana 계정 $login: 만듦(보기 전용)" || echo "Grafana 계정 $login: 만들지 못함"
  fi
done
echo "Grafana: http://127.0.0.1:3000 (팀원은 Tailscale 주소의 :3000)"
