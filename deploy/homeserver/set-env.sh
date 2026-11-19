#!/usr/bin/env bash
# Render(운영 백엔드)의 설정값을 그램 .env로 옮긴다. 이름을 하나씩 물어보고, 붙여 넣은 값은 화면에 보이지 않는다.
# Render에 없는 값은 그냥 Enter로 건너뛴다(이미 들어 있는 값은 그대로 둔다).
#   sudo -u devcookie /srv/devcookie/app/deploy/homeserver/set-env.sh
set -euo pipefail
ENV=/srv/devcookie/.env
[ -w "$ENV" ] || { echo "$ENV을 쓸 수 없습니다. sudo -u devcookie로 실행하세요"; exit 1; }

# "Render에서 보이는 이름|그램 .env의 이름"
PAIRS=(
  "ADMIN_KEY|PROD_ADMIN_KEY"
  "OAUTH_STATE_SECRET|OAUTH_STATE_SECRET"
  "OAUTH_GOOGLE_CLIENT_ID|OAUTH_GOOGLE_CLIENT_ID"
  "OAUTH_GOOGLE_CLIENT_SECRET|OAUTH_GOOGLE_CLIENT_SECRET"
  "OAUTH_KAKAO_CLIENT_ID|OAUTH_KAKAO_CLIENT_ID"
  "OAUTH_KAKAO_CLIENT_SECRET|OAUTH_KAKAO_CLIENT_SECRET"
  "OAUTH_NAVER_CLIENT_ID|OAUTH_NAVER_CLIENT_ID"
  "OAUTH_NAVER_CLIENT_SECRET|OAUTH_NAVER_CLIENT_SECRET"
  "OAUTH_GITHUB_CLIENT_ID|OAUTH_GITHUB_CLIENT_ID"
  "OAUTH_GITHUB_CLIENT_SECRET|OAUTH_GITHUB_CLIENT_SECRET"
  "MAIL_HOST|MAIL_HOST"
  "MAIL_PORT|MAIL_PORT"
  "MAIL_USERNAME|MAIL_USERNAME"
  "MAIL_PASSWORD|MAIL_PASSWORD"
  "MAIL_FROM|MAIL_FROM"
  "FEEDBACK_GITHUB_TOKEN|FEEDBACK_GITHUB_TOKEN"
  "TOSS_CLIENT_KEY|TOSS_CLIENT_KEY"
  "TOSS_SECRET_KEY|TOSS_SECRET_KEY"
  "PAYMENT_OPEN|PAYMENT_OPEN"
  "MATTERMOST_WEBHOOK_URL|MATTERMOST_WEBHOOK_URL"
)

# 값에 특수문자(| & / 등)가 있어도 깨지지 않게 sed 대신 줄 단위로 바꾼다
set_key() {
  local key=$1 value=$2 tmp found=0
  tmp=$(mktemp)
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" == "$key="* ]]; then printf '%s=%s\n' "$key" "$value"; found=1
    else printf '%s\n' "$line"; fi
  done < "$ENV" > "$tmp"
  [ "$found" = 1 ] || printf '%s=%s\n' "$key" "$value" >> "$tmp"
  cat "$tmp" > "$ENV"; rm -f "$tmp"
}

echo "Render → cs-study-backend → Environment에서 값을 복사해 붙여 넣고 Enter. 없으면 그냥 Enter."
echo "(붙여 넣은 값은 화면에 보이지 않는 게 정상입니다)"
echo
saved=0
for pair in "${PAIRS[@]}"; do
  from=${pair%%|*}; to=${pair##*|}
  read -rsp "  $from: " value; echo
  value=${value//$'\r'/}                                   # 붙여 넣을 때 섞인 줄바꿈 제거
  value="${value#"${value%%[![:space:]]*}"}"; value="${value%"${value##*[![:space:]]}"}"  # 앞뒤 공백 제거
  if [ -n "$value" ]; then set_key "$to" "$value"; saved=$((saved+1)); echo "    저장 ($to)"; fi
done
chmod 600 "$ENV"
echo
echo "$saved개를 저장했습니다. 적용: /srv/devcookie/app/deploy/homeserver/compose.sh up -d"
