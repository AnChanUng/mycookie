#!/usr/bin/env bash
# master → 운영, dev → 스테이징. 원격 브랜치에 새 커밋이 있을 때만 이미지를 다시 빌드하고 그 서버만 바꾼다.
# systemd 타이머(devcookie-deploy.timer)가 5분마다 실행한다. 강제로 다시 빌드하려면: deploy.sh --force
set -euo pipefail

ROOT=/srv/devcookie
REPO=https://github.com/AnChanUng/mycookie.git
COMPOSE=(docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
FORCE=${1:-}

exec 9>"$ROOT/.deploy.lock"
flock -n 9 || { echo "다른 배포가 진행 중입니다"; exit 0; }

# 작업 폴더: app(master, compose 파일도 여기서 읽는다), staging(dev)
checkout() {
  local dir=$1 branch=$2
  [ -d "$ROOT/$dir/.git" ] || git clone --branch "$branch" "$REPO" "$ROOT/$dir"
  git -C "$ROOT/$dir" fetch --quiet origin "$branch"
}

deploy() {
  local dir=$1 branch=$2 tag=$3 service=$4
  checkout "$dir" "$branch"
  local current target
  current=$(git -C "$ROOT/$dir" rev-parse HEAD)
  target=$(git -C "$ROOT/$dir" rev-parse "origin/$branch")
  if [ "$current" = "$target" ] && [ "$FORCE" != "--force" ] && docker image inspect "devcookie-backend:$tag" >/dev/null 2>&1; then
    return
  fi
  echo "[$(date '+%F %T')] $service: ${current:0:7} → ${target:0:7}"
  git -C "$ROOT/$dir" reset --quiet --hard "$target"
  # 빌드가 실패하면 set -e로 여기서 멈추고, 돌던 컨테이너는 이전 이미지로 계속 돈다
  docker build --quiet -t "devcookie-backend:$tag" "$ROOT/$dir/backend"
  "${COMPOSE[@]}" up -d --no-deps "$service"
}

deploy app master prod backend-prod
deploy staging dev staging backend-staging
"${COMPOSE[@]}" up -d cloudflared
docker image prune -f >/dev/null
