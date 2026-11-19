#!/usr/bin/env bash
# Neon(클라우드 DB)의 데이터를 그램 서버 PostgreSQL로 한 번 옮긴다.
#   migrate-from-neon.sh prod      # NEON_PROD_URL → cookie_prod
#   migrate-from-neon.sh staging   # NEON_STAGING_URL → cookie_staging
# .env에 NEON_PROD_URL · NEON_STAGING_URL(Neon 연결 문자열)을 넣고 실행한다. 옮기는 동안 그 백엔드는 멈춘다.
set -euo pipefail
WHICH=${1:?prod 또는 staging}
case "$WHICH" in prod|staging) ;; *) echo "prod 또는 staging"; exit 1;; esac
ROOT=/srv/devcookie
COMPOSE=(docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
KEY=NEON_$(echo "$WHICH" | tr a-z A-Z)_URL
SRC=$(grep -E "^$KEY=" "$ROOT/.env" | cut -d= -f2- || true)
[ -n "$SRC" ] || { echo ".env에 $KEY가 없습니다"; exit 1; }
DB=cookie_$WHICH
DUMP="$ROOT/backups/neon-$WHICH-$(date '+%Y%m%d-%H%M').dump"
mkdir -p "$ROOT/backups"

echo "1/3 Neon에서 덤프 → $DUMP"
# postgres 컨테이너의 pg_dump(17)를 쓴다. JDBC용 channel_binding 옵션은 그대로 둬도 libpq가 이해한다
"${COMPOSE[@]}" exec -T postgres pg_dump "$SRC" -Fc --no-owner --no-acl > "$DUMP.part"
mv "$DUMP.part" "$DUMP"

echo "2/3 backend-$WHICH 멈춤 후 $DB에 복원"
"${COMPOSE[@]}" stop "backend-$WHICH" || true
"${COMPOSE[@]}" exec -T postgres pg_restore -U postgres -d "$DB" --clean --if-exists --no-owner --role="$DB" < "$DUMP"

echo "3/3 backend-$WHICH 다시 시작"
"${COMPOSE[@]}" up -d "backend-$WHICH"
"${COMPOSE[@]}" exec -T postgres psql -U postgres -d "$DB" -c "select count(*) as users from users;" || true
echo "완료. Neon 덤프는 $DUMP에 남겨 두었습니다."
