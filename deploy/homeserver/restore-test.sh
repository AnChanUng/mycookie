#!/usr/bin/env bash
# 백업이 정말 되살아나는지 시험한다(한 달에 한 번 권장). 운영 DB는 건드리지 않는다.
# 구글 드라이브의 최신 운영 백업을 받아 비밀번호로 풀고, 스테이징 DB(cookie_staging)에 되살린 뒤 회원 수를 보여 준다.
#   sudo -u devcookie /srv/devcookie/app/deploy/homeserver/restore-test.sh
set -euo pipefail
ROOT=/srv/devcookie
cd "$ROOT"
HERE="$ROOT/app/deploy/homeserver"
REMOTE=$(grep -E '^RCLONE_REMOTE=' "$ROOT/.env" | cut -d= -f2- || true)
PASSFILE="$ROOT/.backup-passphrase"
[ -n "$REMOTE" ] || { echo ".env에 RCLONE_REMOTE가 없습니다(setup-offsite-backup.sh)"; exit 1; }
[ -s "$PASSFILE" ] || { echo "$PASSFILE이 없습니다"; exit 1; }

latest=$(rclone lsf "$REMOTE" --include 'cookie_prod-*.dump.gpg' | sort | tail -1)
[ -n "$latest" ] || { echo "$REMOTE에 운영 백업이 없습니다"; exit 1; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

echo "1/3 내려받기: $REMOTE/$latest"
rclone copy --quiet "$REMOTE/$latest" "$tmp"
echo "2/3 암호 풀기"
gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$PASSFILE" -d "$tmp/$latest" > "$tmp/prod.dump"
echo "3/3 스테이징 DB에 되살리기"
"$HERE/restore.sh" "$tmp/prod.dump" cookie_staging --yes > /dev/null

users=$("$HERE/compose.sh" exec -T postgres psql -U postgres -d cookie_staging -tAc "select count(*) from users")
echo
echo "성공: $latest → cookie_staging (회원 $users명)"
echo "https://staging.mycookie.dev 에서 실제 계정으로 로그인해 보면 확인이 끝납니다."
