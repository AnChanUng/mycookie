#!/usr/bin/env bash
# master → 운영, dev → 스테이징. 원격 브랜치에 새 커밋이 있을 때만 백엔드 · 화면 이미지를 다시 빌드하고 그쪽만 바꾼다.
# systemd 타이머(devcookie-deploy.timer)가 5분마다 실행한다. 강제로 다시 빌드하려면: deploy.sh --force
set -euo pipefail

ROOT=/srv/devcookie
# 어느 폴더에서 실행해도 되게 작업 폴더를 옮긴다(다른 계정의 집 폴더에서 sudo -u로 실행하면 docker compose가 실패한다)
cd "$ROOT"
# 저장소가 비공개라 그램 전용 읽기 키(GitHub Deploy key, ~devcookie/.ssh/id_ed25519)로 SSH로 받는다
REPO=git@github.com:AnChanUng/mycookie.git
# 배포할 브랜치. 바꾸려면 .env에 PROD_BRANCH · STAGING_BRANCH를 넣는다(처음 시험할 때 등)
PROD_BRANCH=$(grep -E '^PROD_BRANCH=' "$ROOT/.env" 2>/dev/null | cut -d= -f2- || true); PROD_BRANCH=${PROD_BRANCH:-master}
STAGING_BRANCH=$(grep -E '^STAGING_BRANCH=' "$ROOT/.env" 2>/dev/null | cut -d= -f2- || true); STAGING_BRANCH=${STAGING_BRANCH:-dev}
COMPOSE=(docker compose --project-directory "$ROOT" -f "$ROOT/app/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
FORCE=${1:-}

exec 9>"$ROOT/.deploy.lock"
flock -n 9 || { echo "다른 배포가 진행 중입니다"; exit 0; }

# 작업 폴더: app(master, 공용 인프라 설정), staging(dev)
checkout() {
  local dir=$1 branch=$2
  [ -d "$ROOT/$dir/.git" ] || git clone --branch "$branch" "$REPO" "$ROOT/$dir"
  git -C "$ROOT/$dir" fetch --quiet origin "$branch"
}

deploy() {
  local dir=$1 branch=$2 tag=$3 env=$4
  checkout "$dir" "$branch"
  local -a service_compose=(docker compose --project-directory "$ROOT" -f "$ROOT/$dir/deploy/homeserver/docker-compose.yml" --env-file "$ROOT/.env")
  local current target changed
  current=$(git -C "$ROOT/$dir" rev-parse HEAD)
  target=$(git -C "$ROOT/$dir" rev-parse "origin/$branch")
  changed=$(git -C "$ROOT/$dir" diff --name-only "$current" "$target")
  git -C "$ROOT/$dir" reset --quiet --hard "$target"
  # 바뀐 쪽만 다시 빌드한다. 문서만 바뀐 커밋으로 사이트를 재시작하지 않게
  local need_backend=0 need_frontend=0
  if [ "$FORCE" = "--force" ] || ! docker image inspect "devcookie-backend:$tag" >/dev/null 2>&1 || grep -q '^backend/' <<<"$changed"; then need_backend=1; fi
  if [ "$FORCE" = "--force" ] || ! docker image inspect "devcookie-frontend:$tag" >/dev/null 2>&1 || grep -q '^frontend/' <<<"$changed"; then need_frontend=1; fi
  [ "$need_backend$need_frontend" = "00" ] && return
  echo "[$(date '+%F %T')] $tag: ${current:0:7} → ${target:0:7} (백엔드 $need_backend, 화면 $need_frontend)"
  # 빌드가 실패하면 set -e로 여기서 멈추고, 돌던 컨테이너는 이전 이미지로 계속 돈다
  if [ "$need_backend" = 1 ]; then
    docker build --quiet -t "devcookie-backend:$tag" "$ROOT/$dir/backend"
    "${service_compose[@]}" up -d --no-deps "backend-$tag"
  fi
  if [ "$need_frontend" = 1 ]; then
    docker build --quiet -t "devcookie-frontend:$tag" \
      --build-arg VITE_DEPLOY_ENV="$env" --build-arg GIT_COMMIT="$target" "$ROOT/$dir/frontend"
    "${service_compose[@]}" up -d --no-deps "frontend-$tag"
  fi
}

mkdir -p "$ROOT/pgdata18" "$ROOT/backups"
# DB, Redis, Kafka가 먼저 떠 있어야 백엔드가 붙는다(처음 한 번은 postgres-init.sh가 운영 · 스테이징 DB를 만든다)
"${COMPOSE[@]}" up -d postgres redis kafka
deploy app "$PROD_BRANCH" prod production
deploy staging "$STAGING_BRANCH" staging preview
# 터널 토큰을 넣기 전에는 그램 안(localhost:8080)에서만 확인한다
if grep -qE '^TUNNEL_TOKEN=.+' "$ROOT/.env"; then
  # 화면과 백엔드는 각 브랜치 설정으로 이미 배포했다.
  "${COMPOSE[@]}" up -d --no-deps cloudflared
else
  echo "TUNNEL_TOKEN이 비어 있어 터널은 띄우지 않았습니다. 확인: http://localhost:8080"
fi
docker image prune -f >/dev/null
