#!/usr/bin/env bash
set -euo pipefail

APP_ROOT=/opt/mistake-atlas
ENV_FILE="$APP_ROOT/shared/app.env"
DATA_ROOT="$APP_ROOT/data"
BACKUP_ROOT="$DATA_ROOT/backups"

test -r "$ENV_FILE"
set -a
source "$ENV_FILE"
set +a

umask 077
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TEMP_DIR="$BACKUP_ROOT/.tmp-$STAMP-$$"
DAILY_DIR="$BACKUP_ROOT/daily/$STAMP"

cleanup() {
  status=$?
  if [[ -d "$TEMP_DIR" ]]; then rm -rf -- "$TEMP_DIR"; fi
  exit "$status"
}
trap cleanup EXIT

install -d -m 0700 "$BACKUP_ROOT" "$BACKUP_ROOT/daily" "$BACKUP_ROOT/weekly" "$BACKUP_ROOT/monthly" "$TEMP_DIR"

pg_dump --format=custom --no-owner --no-acl --file="$TEMP_DIR/database.dump" "$DATABASE_URL"
pg_restore --list "$TEMP_DIR/database.dump" >/dev/null
tar -C "$DATA_ROOT" -czf "$TEMP_DIR/uploads.tar.gz" uploads
tar -C "$DATA_ROOT" -czf "$TEMP_DIR/imports.tar.gz" imports

QUESTION_COUNT="$(psql "$DATABASE_URL" -Atc 'SELECT COUNT(*) FROM "Question" WHERE "status" <> '\''DELETED'\'';')"
ATTEMPT_COUNT="$(psql "$DATABASE_URL" -Atc 'SELECT COUNT(*) FROM "ReviewAttempt";')"
ATTACHMENT_COUNT="$(psql "$DATABASE_URL" -Atc 'SELECT COUNT(*) FROM "Attachment" WHERE "deletedAt" IS NULL;')"
RELEASE_COMMIT="$(basename "$(readlink -f "$APP_ROOT/current")")"

printf 'BACKUP_FORMAT_VERSION=1\nQUESTION_COUNT=%s\nATTEMPT_COUNT=%s\nATTACHMENT_COUNT=%s\n' \
  "$QUESTION_COUNT" "$ATTEMPT_COUNT" "$ATTACHMENT_COUNT" > "$TEMP_DIR/counts.env"
printf '{"formatVersion":1,"createdAt":"%s","release":"%s","questions":%s,"attempts":%s,"attachments":%s}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$RELEASE_COMMIT" "$QUESTION_COUNT" "$ATTEMPT_COUNT" "$ATTACHMENT_COUNT" > "$TEMP_DIR/manifest.json"

(
  cd "$TEMP_DIR"
  sha256sum database.dump uploads.tar.gz imports.tar.gz counts.env manifest.json > SHA256SUMS
  sha256sum -c SHA256SUMS >/dev/null
)

mv "$TEMP_DIR" "$DAILY_DIR"
TEMP_DIR=''

if [[ "$(date +%u)" == '7' ]]; then
  WEEKLY_DIR="$BACKUP_ROOT/weekly/$(date +%G-W%V)"
  if [[ ! -e "$WEEKLY_DIR" ]]; then cp -al "$DAILY_DIR" "$WEEKLY_DIR"; fi
fi
if [[ "$(date +%d)" == '01' ]]; then
  MONTHLY_DIR="$BACKUP_ROOT/monthly/$(date +%Y-%m)"
  if [[ ! -e "$MONTHLY_DIR" ]]; then cp -al "$DAILY_DIR" "$MONTHLY_DIR"; fi
fi

prune_backups() {
  local directory="$1" keep="$2" index target
  local -a entries=()
  mapfile -t entries < <(find "$directory" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn)
  for ((index=keep; index<${#entries[@]}; index++)); do
    target="${entries[$index]#* }"
    if [[ "$target" == "$directory"/* ]]; then rm -rf -- "$target"; fi
  done
}

prune_backups "$BACKUP_ROOT/daily" 7
prune_backups "$BACKUP_ROOT/weekly" 4
prune_backups "$BACKUP_ROOT/monthly" 6

if [[ -n "${BACKUP_REMOTE_DIR:-}" ]]; then
  install -d -m 0700 "$BACKUP_REMOTE_DIR"
  cp -a "$DAILY_DIR" "$BACKUP_REMOTE_DIR/$STAMP"
fi

cp "$DAILY_DIR/manifest.json" "$BACKUP_ROOT/last-success.json"
echo "Mistake Atlas backup completed: $DAILY_DIR"
