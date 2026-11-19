#!/usr/bin/env bash
# 운영 · 스테이징 DB를 매일 덤프한다(systemd 타이머 devcookie-backup.timer, 새벽 4시).
# /srv/devcookie/backups에 14일치를 두고, BACKUP_COPY_DIR(외장 디스크 · NAS 마운트 경로)이 있으면 같은 파일을 복사한다.
# 노트북 디스크가 망가지면 pgdata도 같이 사라지므로, 복사본은 반드시 다른 디스크에 둔다.
# RCLONE_REMOTE(예: gdrive:mycookie-backups)가 있으면 덤프를 비밀번호(/srv/devcookie/.backup-passphrase)로 암호화해서
# 클라우드에도 올리고, 30일 지난 것은 지운다(3-2-1 원칙의 "집 밖 사본"). 설정: setup-offsite-backup.sh
# 되살리기: restore.sh <덤프 파일> <cookie_prod|cookie_staging>
#   클라우드 사본: rclone copy <원격>/<파일>.gpg . → gpg -d --passphrase-file <비밀번호 파일> <파일>.gpg > <파일>
set -euo pipefail

ROOT=/srv/devcookie
# 어느 폴더에서 실행해도 되게 작업 폴더를 옮긴다(다른 계정의 집 폴더에서 sudo -u로 실행하면 docker compose가 실패한다)
cd "$ROOT"
COMPOSE=(docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
KEEP_DAYS=${KEEP_DAYS:-14}
COPY_DIR=$(grep -E '^BACKUP_COPY_DIR=' "$ROOT/.env" | cut -d= -f2- || true)
REMOTE=$(grep -E '^RCLONE_REMOTE=' "$ROOT/.env" | cut -d= -f2- || true)
PASSFILE="$ROOT/.backup-passphrase"
REMOTE_KEEP=${REMOTE_KEEP:-30d}
STAMP=$(date '+%Y%m%d-%H%M')
mkdir -p "$ROOT/backups"

for db in cookie_prod cookie_staging; do
  file="$ROOT/backups/$db-$STAMP.dump"
  # -Fc: 압축된 사용자 정의 형식. pg_restore로 표 하나만 되살릴 수도 있다
  "${COMPOSE[@]}" exec -T postgres pg_dump -U postgres -Fc "$db" > "$file.part"
  mv "$file.part" "$file"
  echo "[$(date '+%F %T')] $db → $file ($(du -h "$file" | cut -f1))"
  # 집 밖 사본: 암호화해서 올린다. 실패해도 그램 안의 백업은 남기고 경고만 한다
  if [ -n "$REMOTE" ]; then
    if [ ! -s "$PASSFILE" ]; then
      echo "경고: $PASSFILE이 없어 클라우드에 올리지 않았습니다(setup-offsite-backup.sh)" >&2
    elif gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-file "$PASSFILE" \
           --symmetric --cipher-algo AES256 -o "$file.gpg" "$file" \
         && rclone copy --quiet "$file.gpg" "$REMOTE"; then
      echo "    → $REMOTE/$(basename "$file").gpg"
    else
      echo "경고: 클라우드 업로드 실패($REMOTE)" >&2
    fi
    rm -f "$file.gpg"
  fi
  if [ -n "$COPY_DIR" ]; then
    if [ -d "$COPY_DIR" ]; then cp "$file" "$COPY_DIR/"; else echo "경고: BACKUP_COPY_DIR($COPY_DIR)이 없습니다. 외장 디스크가 연결됐는지 확인하세요" >&2; fi
  fi
done

find "$ROOT/backups" -name '*.dump' -mtime +"$KEEP_DAYS" -delete
[ -n "$COPY_DIR" ] && [ -d "$COPY_DIR" ] && find "$COPY_DIR" -name 'cookie_*.dump' -mtime +"$KEEP_DAYS" -delete
if [ -n "$REMOTE" ]; then
  rclone delete --quiet --min-age "$REMOTE_KEEP" --include 'cookie_*.dump.gpg' "$REMOTE" || echo "경고: 클라우드의 오래된 백업을 지우지 못했습니다" >&2
fi
exit 0
