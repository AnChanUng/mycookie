#!/usr/bin/env bash
# 관리자 계정 만들기와 권한 주기(홈서버에서만). 관리자 키(/srv/devcookie/.env의 PROD_ADMIN_KEY, STAGING_ADMIN_KEY)로 백엔드를 부른다.
#   sudo ./account.sh create admin1 ADMIN,TEAM     관리자 계정 만들기(비밀번호는 화면에 안 보이게 두 번 입력)
#   sudo ./account.sh grant 쿠우키 OWNER            기존 계정에 권한 주기(ADMIN, OWNER, TEAM, BANK=비공개 문제집)
#   sudo ./account.sh revoke 쿠우키 OWNER           권한 빼기
#   sudo ./account.sh list                         권한 있는 계정 보기
# 기본은 운영(127.0.0.1:8080). 스테이징은 맨 앞에 --staging을 붙인다(운영과 DB, 계정이 따로다)
set -euo pipefail
ROOT=/srv/devcookie
BASE=http://127.0.0.1:8080 VAR=PROD_ADMIN_KEY
if [ "${1:-}" = "--staging" ]; then BASE=http://127.0.0.1:8081 VAR=STAGING_ADMIN_KEY; shift; fi
KEY=$(grep -E "^$VAR=" "$ROOT/.env" | head -1 | cut -d= -f2- || true)
[ -n "$KEY" ] || { echo "$VAR가 $ROOT/.env에 없어요."; exit 1; }

call() { # $1=메서드 $2=경로 $3=JSON
  local out code
  out=$(curl -sS -w '\n%{http_code}' -X "$1" "$BASE/api/v1/admin/$2" -H "X-Admin-Key: $KEY" -H 'Content-Type: application/json' ${3:+--data "$3"})
  code=${out##*$'\n'}; out=${out%$'\n'*}
  echo "$out"
  [ "${code:0:1}" = 2 ] || { echo "실패(HTTP $code)"; exit 1; }
}
json() { python3 -c 'import json,sys; print(json.dumps(dict(zip(sys.argv[1::2], sys.argv[2::2]))))' "$@"; }

case "${1:-}" in
  create|test-account)
    action=$1
    name=${2:?닉네임을 적어 주세요(예: admin1)}; roles=${3:-ADMIN,TEAM}
    read -rsp "$name 비밀번호(아이디 포함 금지): " pw; echo
    read -rsp "한 번 더: " pw2; echo
    [ "$pw" = "$pw2" ] || { echo "두 비밀번호가 달라요."; exit 1; }
    body=$(python3 -c 'import json,sys; print(json.dumps({"nickname":sys.argv[1],"password":sys.argv[2],"roles":sys.argv[3].split(",")}))' "$name" "$pw" "$roles")
    unset pw pw2
    if [ "$action" = test-account ]; then call POST test-accounts "$body"
    else call POST accounts "$body"; fi ;;
  test-profile) call POST test-accounts/profile "$(json nickname "${2:?닉네임}")" ;;
  grant)  call POST roles "$(json nickname "${2:?닉네임}" role "${3:?권한}")" ;;
  revoke) call POST roles "$(python3 -c 'import json,sys; print(json.dumps({"nickname":sys.argv[1],"role":sys.argv[2],"grant":False}))' "${2:?닉네임}" "${3:?권한}")" ;;
  list)   call GET roles ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
