#!/usr/bin/env bash
# 백업 덤프로 DB를 되살린다. 그 DB의 지금 데이터는 덤프 내용으로 바뀐다.
#   restore.sh /srv/devcookie/backups/cookie_prod-20261120-0400.dump cookie_prod
set -euo pipefail
FILE=${1:?덤프 파일 경로}; DB=${2:?cookie_prod 또는 cookie_staging}
case "$DB" in cookie_prod|cookie_staging) ;; *) echo "DB 이름은 cookie_prod 또는 cookie_staging"; exit 1;; esac
ROOT=/srv/devcookie
COMPOSE=(docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
read -r -p "$DB의 데이터를 $FILE 내용으로 바꿉니다. 계속할까요? (yes) " ok
[ "$ok" = "yes" ] || exit 1
svc=backend-${DB#cookie_}
"${COMPOSE[@]}" stop "$svc"
"${COMPOSE[@]}" exec -T postgres pg_restore -U postgres -d "$DB" --clean --if-exists --no-owner --role="$DB" < "$FILE"
"${COMPOSE[@]}" start "$svc"
echo "되살리기 완료: $DB"
