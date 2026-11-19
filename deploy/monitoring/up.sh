#!/usr/bin/env bash
# 로그 모니터링을 띄운다(처음 한 번, 그리고 설정을 바꿨을 때). devcookie 서비스와는 따로 돈다.
#   sudo /srv/devcookie/app/deploy/monitoring/up.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA=/srv/mycookie-monitoring
ENV="$DATA/.env"

mkdir -p "$DATA/loki" "$DATA/grafana" "$DATA/alloy"
# 컨테이너 안의 사용자(Loki 10001, Grafana 472)가 쓸 수 있게 한다
chown -R 10001:10001 "$DATA/loki"
chown -R 472:0 "$DATA/grafana"

if [ ! -f "$ENV" ]; then
  cp "$HERE/.env.example" "$ENV"
  chmod 600 "$ENV"
  # 관리자 비밀번호를 무작위로 만들어 넣는다(화면에 보여 주지 않는다. 확인: sudo grep GRAFANA_ADMIN_PASSWORD /srv/mycookie-monitoring/.env)
  sed -i "s|^GRAFANA_ADMIN_PASSWORD=.*|GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')|" "$ENV"
  echo "$ENV을 만들었습니다(관리자 비밀번호 자동 생성)."
fi

docker compose --project-directory "$HERE" -f "$HERE/docker-compose.yml" --env-file "$ENV" up -d
docker compose --project-directory "$HERE" -f "$HERE/docker-compose.yml" --env-file "$ENV" ps
echo "Grafana: http://127.0.0.1:3000 (팀원은 Tailscale 주소의 :3000)"
