#!/usr/bin/env bash
set -euo pipefail

REPOSITORY=/opt/LearnWeb
APP_ROOT=/opt/mistake-atlas
ENV_FILE="$APP_ROOT/shared/app.env"
CURRENT_LINK="$APP_ROOT/current"
NGINX_TARGET=/etc/nginx/sites-available/learn.aurorastar.cn
SERVICE_TARGET=/etc/systemd/system/mistake-atlas.service
BACKUP_SERVICE_TARGET=/etc/systemd/system/mistake-atlas-backup.service
BACKUP_TIMER_TARGET=/etc/systemd/system/mistake-atlas-backup.timer
LOCK_FILE=/run/mistake-atlas-deploy.lock

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another Mistake Atlas deployment is already running." >&2
  exit 1
fi

test -f "$ENV_FILE"
install -d -m 0750 -o mistake-atlas -g mistake-atlas "$APP_ROOT/data/imports"
if ! grep -q '^IMPORT_ROOT=' "$ENV_FILE"; then
  printf 'IMPORT_ROOT=%s/data/imports\n' "$APP_ROOT" >> "$ENV_FILE"
fi
git -C "$REPOSITORY" fetch origin main
git -C "$REPOSITORY" checkout main
git -C "$REPOSITORY" pull --ff-only origin main
COMMIT="$(git -C "$REPOSITORY" rev-parse HEAD)"
RELEASE="$APP_ROOT/releases/$COMMIT"
PREVIOUS="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
NGINX_BACKUP="/etc/nginx/sites-available/learn.aurorastar.cn.pre-$COMMIT"
SMOKE_PID=''
SMOKE_PORT=33117
SMOKE_LOG="/run/mistake-atlas-smoke-$COMMIT.log"
CUTOVER=0
RELEASE_STAGING=''

rollback() {
  status=$?
  if [[ -n "$SMOKE_PID" ]]; then kill -- -"$SMOKE_PID" >/dev/null 2>&1 || true; fi
  if [[ -n "$RELEASE_STAGING" && -d "$RELEASE_STAGING" ]]; then rm -rf -- "$RELEASE_STAGING"; fi
  if [[ $status -ne 0 && $CUTOVER -eq 1 && -n "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "$CURRENT_LINK"
    if [[ -f "$NGINX_BACKUP" ]]; then cp "$NGINX_BACKUP" "$NGINX_TARGET"; fi
    systemctl daemon-reload
    systemctl restart mistake-atlas.service || true
    nginx -t && systemctl reload nginx || true
    echo "Deployment failed; application symlink and Nginx configuration were rolled back." >&2
  fi
  exit "$status"
}
trap rollback EXIT

if [[ ! -d "$RELEASE" ]]; then
  RELEASE_STAGING="$APP_ROOT/releases/.${COMMIT}.staging.$$"
  install -d -m 0755 "$RELEASE_STAGING"
  git -C "$REPOSITORY" archive "$COMMIT" | tar -x -C "$RELEASE_STAGING"
  mv "$RELEASE_STAGING" "$RELEASE"
  RELEASE_STAGING=''
fi

set -a
source "$ENV_FILE"
set +a

cd "$RELEASE/frontend"
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm test
npm run lint
npm run build

chown -R root:root "$RELEASE"
chmod -R a+rX "$RELEASE"

if ss -H -ltn "sport = :$SMOKE_PORT" | grep -q .; then
  echo "Smoke-test port $SMOKE_PORT is already in use." >&2
  exit 1
fi
setsid runuser -u mistake-atlas -- bash -c "set -a; source '$ENV_FILE'; set +a; cd '$RELEASE/frontend'; exec npm run start -- -H 127.0.0.1 -p '$SMOKE_PORT'" >"$SMOKE_LOG" 2>&1 &
SMOKE_PID="$!"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$SMOKE_PORT/api/health" >/dev/null && curl -fsS "http://127.0.0.1:$SMOKE_PORT/access" >/dev/null; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$SMOKE_PORT/api/health" >/dev/null
curl -fsS "http://127.0.0.1:$SMOKE_PORT/access" | grep -q 'Current content is being improved'
kill -- -"$SMOKE_PID" >/dev/null 2>&1 || true
wait "$SMOKE_PID" 2>/dev/null || true
SMOKE_PID=''
rm -f "$SMOKE_LOG"

if [[ -f "$NGINX_TARGET" ]]; then cp "$NGINX_TARGET" "$NGINX_BACKUP"; fi
ln -sfn "$RELEASE" "$CURRENT_LINK"
install -m 0644 "$RELEASE/deploy/systemd/mistake-atlas.service" "$SERVICE_TARGET"
install -m 0644 "$RELEASE/deploy/systemd/mistake-atlas-backup.service" "$BACKUP_SERVICE_TARGET"
install -m 0644 "$RELEASE/deploy/systemd/mistake-atlas-backup.timer" "$BACKUP_TIMER_TARGET"
install -m 0644 "$RELEASE/nginx/learn.aurorastar.cn.conf" "$NGINX_TARGET"
CUTOVER=1

systemctl daemon-reload
nginx -t
systemctl restart mistake-atlas.service
systemctl enable mistake-atlas.service >/dev/null
systemctl enable --now mistake-atlas-backup.timer >/dev/null
systemctl reload nginx

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3011/api/health >/dev/null; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:3011/api/health | grep -q '"status":"ok"'
curl -fsS https://learn.aurorastar.cn/access | grep -q 'Current content is being improved'
systemctl is-active --quiet mistake-atlas.service

mapfile -t RELEASES_BY_AGE < <(find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn)
for ((index=3; index<${#RELEASES_BY_AGE[@]}; index++)); do
  OLD_RELEASE="${RELEASES_BY_AGE[$index]#* }"
  if [[ "$OLD_RELEASE" == "$APP_ROOT/releases/"* && "$OLD_RELEASE" != "$(readlink -f "$CURRENT_LINK")" ]]; then
    rm -rf -- "$OLD_RELEASE"
  fi
done

CUTOVER=0
trap - EXIT
echo "Deployed Mistake Atlas release $COMMIT"
