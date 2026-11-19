#!/usr/bin/env bash
# 운영 · 스테이징 DB를 매일 덤프한다(systemd 타이머 devcookie-backup.timer, 새벽 4시).
# /srv/devcookie/backups에 14일치를 두고, BACKUP_COPY_DIR(외장 디스크 · NAS 마운트 경로)이 있으면 같은 파일을 복사한다.
# 노트북 디스크가 망가지면 pgdata도 같이 사라지므로, 복사본은 반드시 다른 디스크에 둔다.
# 되살리기: restore.sh <덤프 파일> <cookie_prod|cookie_staging>
set -euo pipefail

ROOT=/srv/devcookie
COMPOSE=(docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
KEEP_DAYS=${KEEP_DAYS:-14}
COPY_DIR=$(grep -E '^BACKUP_COPY_DIR=' "$ROOT/.env" | cut -d= -f2- || true)
STAMP=$(date '+%Y%m%d-%H%M')
mkdir -p "$ROOT/backups"

for db in cookie_prod cookie_staging; do
  file="$ROOT/backups/$db-$STAMP.dump"
  # -Fc: 압축된 사용자 정의 형식. pg_restore로 표 하나만 되살릴 수도 있다
  "${COMPOSE[@]}" exec -T postgres pg_dump -U postgres -Fc "$db" > "$file.part"
  mv "$file.part" "$file"
  echo "[$(date '+%F %T')] $db → $file ($(du -h "$file" | cut -f1))"
  if [ -n "$COPY_DIR" ]; then
    if [ -d "$COPY_DIR" ]; then cp "$file" "$COPY_DIR/"; else echo "경고: BACKUP_COPY_DIR($COPY_DIR)이 없습니다. 외장 디스크가 연결됐는지 확인하세요" >&2; fi
  fi
done

find "$ROOT/backups" -name '*.dump' -mtime +"$KEEP_DAYS" -delete
[ -n "$COPY_DIR" ] && [ -d "$COPY_DIR" ] && find "$COPY_DIR" -name 'cookie_*.dump' -mtime +"$KEEP_DAYS" -delete
exit 0
