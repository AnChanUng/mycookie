#!/usr/bin/env bash
# Neon(클라우드 DB)의 데이터를 그램 서버 PostgreSQL로 한 번 옮긴다.
#   migrate-from-neon.sh prod      # NEON_PROD_URL → cookie_prod
#   migrate-from-neon.sh staging   # NEON_STAGING_URL → cookie_staging
# .env에 NEON_PROD_URL · NEON_STAGING_URL(Neon 연결 문자열)을 넣고 실행한다. 옮기는 동안 그 백엔드는 멈춘다.
set -euo pipefail
WHICH=${1:?prod 또는 staging}
case "$WHICH" in prod|staging) ;; *) echo "prod 또는 staging"; exit 1;; esac
ROOT=/srv/devcookie
# 어느 폴더에서 실행해도 되게 작업 폴더를 옮긴다(다른 계정의 집 폴더에서 sudo -u로 실행하면 docker compose가 실패한다)
cd "$ROOT"
COMPOSE=(docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
KEY=NEON_$(echo "$WHICH" | tr a-z A-Z)_URL
SRC=$(grep -E "^$KEY=" "$ROOT/.env" | cut -d= -f2- || true)
[ -n "$SRC" ] || { echo ".env에 $KEY가 없습니다"; exit 1; }
DB=cookie_$WHICH
DUMP="$ROOT/backups/neon-$WHICH-$(date '+%Y%m%d-%H%M').dump"
mkdir -p "$ROOT/backups"

echo "1/3 Neon에서 덤프 → $DUMP"
# postgres 컨테이너의 pg_dump(18)를 쓴다. JDBC용 channel_binding 옵션은 그대로 둬도 libpq가 이해한다
"${COMPOSE[@]}" exec -T postgres pg_dump "$SRC" -Fc --no-owner --no-acl > "$DUMP.part"
mv "$DUMP.part" "$DUMP"

echo "2/3 backend-$WHICH 멈춤 후 $DB에 복원"
"${COMPOSE[@]}" stop "backend-$WHICH" || true
# 복원 전에 DB를 통째로 비운다. 백엔드(JPA)가 먼저 만든 표가 남아 있으면 --clean이 identity 열에서 실패한다
"${COMPOSE[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -q <<SQL
DROP DATABASE IF EXISTS $DB WITH (FORCE);
CREATE DATABASE $DB OWNER $DB ENCODING 'UTF8' TEMPLATE template0;
REVOKE ALL ON DATABASE $DB FROM PUBLIC;
SQL
"${COMPOSE[@]}" exec -T postgres pg_restore -U postgres -d "$DB" --no-owner --role="$DB" --exit-on-error < "$DUMP"

echo "3/3 backend-$WHICH 다시 시작"
"${COMPOSE[@]}" up -d "backend-$WHICH"
"${COMPOSE[@]}" exec -T postgres psql -U postgres -d "$DB" -c "select count(*) as users from users;" || true
echo "완료. Neon 덤프는 $DUMP에 남겨 두었습니다."
