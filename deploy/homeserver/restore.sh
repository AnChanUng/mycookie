#!/usr/bin/env bash
# 백업 덤프로 DB를 되살린다. 그 DB의 지금 데이터는 덤프 내용으로 바뀐다.
#   restore.sh /srv/devcookie/backups/cookie_prod-20261120-0400.dump cookie_prod
set -euo pipefail
FILE=${1:?덤프 파일 경로}; DB=${2:?cookie_prod 또는 cookie_staging}
case "$DB" in cookie_prod|cookie_staging) ;; *) echo "DB 이름은 cookie_prod 또는 cookie_staging"; exit 1;; esac
ROOT=/srv/devcookie
# 어느 폴더에서 실행해도 되게 작업 폴더를 옮긴다(다른 계정의 집 폴더에서 sudo -u로 실행하면 docker compose가 실패한다)
cd "$ROOT"
COMPOSE=(docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
read -r -p "$DB의 데이터를 $FILE 내용으로 바꿉니다. 계속할까요? (yes) " ok
[ "$ok" = "yes" ] || exit 1
svc=backend-${DB#cookie_}
"${COMPOSE[@]}" stop "$svc"
# 복원 전에 DB를 통째로 비운다. 백엔드(JPA)가 먼저 만든 표가 남아 있으면 --clean이 identity 열에서 실패한다
"${COMPOSE[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -q <<SQL
DROP DATABASE IF EXISTS $DB WITH (FORCE);
CREATE DATABASE $DB OWNER $DB ENCODING 'UTF8' TEMPLATE template0;
REVOKE ALL ON DATABASE $DB FROM PUBLIC;
SQL
"${COMPOSE[@]}" exec -T postgres pg_restore -U postgres -d "$DB" --no-owner --role="$DB" --exit-on-error < "$FILE"
"${COMPOSE[@]}" start "$svc"
echo "되살리기 완료: $DB"
