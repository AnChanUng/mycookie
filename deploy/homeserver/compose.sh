#!/usr/bin/env bash
# 그램 서버의 docker compose를 바른 설정으로 부른다. 예: compose.sh ps, compose.sh restart backend-prod, compose.sh logs -f backend-prod
set -euo pipefail
ROOT=/srv/devcookie
cd "$ROOT"
exec docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env" "$@"
