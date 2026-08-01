#!/usr/bin/env bash
set -euo pipefail

APP_ROOT=/opt/mistake-atlas
ENV_FILE="$APP_ROOT/shared/app.env"
DATA_ROOT="$APP_ROOT/data"
BACKUP_ROOT="$DATA_ROOT/backups"

if [[ $# -ne 2 || "$2" != '--confirm' ]]; then
  echo "Usage: $0 /opt/mistake-atlas/data/backups/<tier>/<backup> --confirm" >&2
  exit 2
fi

BACKUP_DIR="$(readlink -f "$1")"
if [[ "$BACKUP_DIR" != "$BACKUP_ROOT"/* || ! -f "$BACKUP_DIR/SHA256SUMS" ]]; then
  echo "Backup directory is outside the managed backup root or incomplete." >&2
  exit 2
fi

test -r "$ENV_FILE"
set -a
source "$ENV_FILE"
set +a

(
  cd "$BACKUP_DIR"
  sha256sum -c SHA256SUMS
)
pg_restore --list "$BACKUP_DIR/database.dump" >/dev/null

for archive in uploads imports; do
  if tar -tzf "$BACKUP_DIR/$archive.tar.gz" | grep -Ev "^$archive(/|$)" | grep -q .; then
    echo "Unexpected path found in $archive archive." >&2
    exit 1
  fi
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RESTORE_DIR="$DATA_ROOT/.restore-$STAMP-$$"
PREVIOUS_UPLOADS="$DATA_ROOT/uploads.pre-restore-$STAMP"
PREVIOUS_IMPORTS="$DATA_ROOT/imports.pre-restore-$STAMP"
SERVICE_STOPPED=0
install -d -m 0700 "$RESTORE_DIR"
cleanup() {
  status=$?
  if [[ $status -ne 0 && $SERVICE_STOPPED -eq 1 ]]; then
    if [[ ! -d "$DATA_ROOT/uploads" && -d "$PREVIOUS_UPLOADS" ]]; then mv "$PREVIOUS_UPLOADS" "$DATA_ROOT/uploads"; fi
    if [[ ! -d "$DATA_ROOT/imports" && -d "$PREVIOUS_IMPORTS" ]]; then mv "$PREVIOUS_IMPORTS" "$DATA_ROOT/imports"; fi
    systemctl start mistake-atlas.service || true
  fi
  if [[ -d "$RESTORE_DIR" ]]; then rm -rf -- "$RESTORE_DIR"; fi
  exit "$status"
}
trap cleanup EXIT
tar -C "$RESTORE_DIR" -xzf "$BACKUP_DIR/uploads.tar.gz"
tar -C "$RESTORE_DIR" -xzf "$BACKUP_DIR/imports.tar.gz"

systemctl stop mistake-atlas.service
SERVICE_STOPPED=1
if ! pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$BACKUP_DIR/database.dump"; then
  exit 1
fi

mv "$DATA_ROOT/uploads" "$PREVIOUS_UPLOADS"
mv "$DATA_ROOT/imports" "$PREVIOUS_IMPORTS"
mv "$RESTORE_DIR/uploads" "$DATA_ROOT/uploads"
mv "$RESTORE_DIR/imports" "$DATA_ROOT/imports"
chown -R mistake-atlas:mistake-atlas "$DATA_ROOT/uploads" "$DATA_ROOT/imports"
systemctl start mistake-atlas.service
SERVICE_STOPPED=0

set -a
source "$BACKUP_DIR/counts.env"
set +a
RESTORED_QUESTIONS="$(psql "$DATABASE_URL" -Atc 'SELECT COUNT(*) FROM "Question" WHERE "status" <> '\''DELETED'\'';')"
RESTORED_ATTEMPTS="$(psql "$DATABASE_URL" -Atc 'SELECT COUNT(*) FROM "Attempt";')"
RESTORED_ATTACHMENTS="$(psql "$DATABASE_URL" -Atc 'SELECT COUNT(*) FROM "Attachment" WHERE "deletedAt" IS NULL;')"
if [[ "$RESTORED_QUESTIONS" != "$QUESTION_COUNT" || "$RESTORED_ATTEMPTS" != "$ATTEMPT_COUNT" || "$RESTORED_ATTACHMENTS" != "$ATTACHMENT_COUNT" ]]; then
  echo "Restore completed but row-count verification failed." >&2
  exit 1
fi
curl -fsS http://127.0.0.1:3011/api/health >/dev/null
echo "Restore verified. Previous upload/import directories were retained with suffix: pre-restore-$STAMP"
