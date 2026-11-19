#!/usr/bin/env bash
# 백업을 구글 드라이브(집 밖)에도 올리도록 한 번 설정한다. 그램 Ubuntu 창에서 sudo로 실행한다.
#   sudo /srv/devcookie/app/deploy/homeserver/setup-offsite-backup.sh
# 1) rclone 설치  2) 백업 암호화 비밀번호 정하기  3) 구글 드라이브 연결(브라우저 로그인)  4) .env에 RCLONE_REMOTE  5) 시험 업로드
set -euo pipefail
ROOT=/srv/devcookie
PASSFILE="$ROOT/.backup-passphrase"
REMOTE_NAME=gdrive
REMOTE="$REMOTE_NAME:mycookie-backups"
[ "$(id -u)" = 0 ] || { echo "sudo로 실행하세요"; exit 1; }

echo "1/5 rclone 설치"
command -v rclone >/dev/null || apt-get install -y -qq rclone >/dev/null
command -v gpg >/dev/null || apt-get install -y -qq gnupg >/dev/null

echo "2/5 백업 암호화 비밀번호"
if [ -s "$PASSFILE" ]; then
  echo "    이미 있습니다($PASSFILE). 그대로 씁니다."
else
  echo "    클라우드에 올리는 백업을 잠글 비밀번호를 정하세요. 화면에 보이지 않습니다."
  echo "    ※ 이 비밀번호를 잃어버리면 클라우드 백업을 되살릴 수 없습니다. 비밀번호 관리 앱이나 종이에 따로 적어 두세요."
  while :; do
    read -rsp "    비밀번호: " p1; echo
    read -rsp "    한 번 더: " p2; echo
    [ "$p1" = "$p2" ] && [ ${#p1} -ge 8 ] && break
    echo "    두 비밀번호가 다르거나 8자보다 짧습니다. 다시 입력하세요."
  done
  printf '%s' "$p1" > "$PASSFILE"; unset p1 p2
  chown devcookie: "$PASSFILE"; chmod 600 "$PASSFILE"
fi

echo "3/5 구글 드라이브 연결"
if sudo -u devcookie -H rclone listremotes 2>/dev/null | grep -qx "$REMOTE_NAME:"; then
  echo "    이미 연결돼 있습니다."
else
  echo "    잠시 뒤 나오는 주소(http://127.0.0.1:53682/auth?...)를 Windows 브라우저에서 열고 구글 계정으로 허용하세요."
  # drive.file 범위: rclone이 만든 파일만 볼 수 있다(내 드라이브의 다른 파일은 못 본다)
  sudo -u devcookie -H rclone config create "$REMOTE_NAME" drive scope=drive.file
fi

echo "4/5 .env에 RCLONE_REMOTE"
if grep -qE '^RCLONE_REMOTE=' "$ROOT/.env"; then
  sed -i "s|^RCLONE_REMOTE=.*|RCLONE_REMOTE=$REMOTE|" "$ROOT/.env"
else
  echo "RCLONE_REMOTE=$REMOTE" >> "$ROOT/.env"
fi

echo "5/5 시험 백업과 업로드"
sudo -u devcookie "$ROOT/app/deploy/homeserver/backup.sh"
echo
echo "구글 드라이브에 올라간 백업:"
sudo -u devcookie -H rclone ls "$REMOTE" | tail -4
