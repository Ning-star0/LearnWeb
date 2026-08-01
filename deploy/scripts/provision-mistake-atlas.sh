#!/usr/bin/env bash
set -euo pipefail

APP_ROOT=/opt/mistake-atlas
SHARED_DIR="$APP_ROOT/shared"
DATA_DIR="$APP_ROOT/data"
ENV_FILE="$SHARED_DIR/app.env"
INITIAL_PASSWORD_FILE="$SHARED_DIR/initial-password.txt"

if ! id mistake-atlas >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_ROOT" --shell /usr/sbin/nologin mistake-atlas
fi

install -d -m 0750 -o root -g mistake-atlas "$SHARED_DIR"
install -d -m 0750 -o mistake-atlas -g mistake-atlas "$DATA_DIR" "$DATA_DIR/uploads" "$DATA_DIR/imports" "$DATA_DIR/exports"
install -d -m 0700 -o root -g root "$DATA_DIR/backups"

if [[ ! -f "$ENV_FILE" ]]; then
  DB_PASSWORD="$(openssl rand -hex 32)"
  AUTH_SECRET="$(openssl rand -hex 48)"
  ADMIN_INITIAL_PASSWORD="Atlas9-$(openssl rand -hex 12)"

  if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='mistake_atlas'" | grep -q 1; then
    runuser -u postgres -- psql --set=db_password="$DB_PASSWORD" <<'SQL'
CREATE ROLE mistake_atlas LOGIN PASSWORD :'db_password';
SQL
  fi
  if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='mistake_atlas'" | grep -q 1; then
    runuser -u postgres -- createdb --owner=mistake_atlas --encoding=UTF8 mistake_atlas
  fi

  umask 027
  {
    printf 'DATABASE_URL=postgresql://mistake_atlas:%s@127.0.0.1:5432/mistake_atlas\n' "$DB_PASSWORD"
    printf 'AUTH_SECRET=%s\n' "$AUTH_SECRET"
    printf 'ADMIN_USERNAME=baixing\n'
    printf 'ADMIN_INITIAL_PASSWORD=%s\n' "$ADMIN_INITIAL_PASSWORD"
    printf 'APP_URL=https://learn.aurorastar.cn\n'
    printf 'APP_TIMEZONE=Asia/Shanghai\n'
    printf 'UPLOAD_ROOT=%s/uploads\n' "$DATA_DIR"
    printf 'IMPORT_ROOT=%s/imports\n' "$DATA_DIR"
    printf 'AI_BASE_URL=\nAI_API_KEY=\nAI_MODEL=\nAI_TIMEOUT_MS=60000\n'
  } > "$ENV_FILE"
  chown root:mistake-atlas "$ENV_FILE"
  chmod 0640 "$ENV_FILE"
  printf '%s\n' "$ADMIN_INITIAL_PASSWORD" > "$INITIAL_PASSWORD_FILE"
  chown root:root "$INITIAL_PASSWORD_FILE"
  chmod 0600 "$INITIAL_PASSWORD_FILE"
fi

if ! grep -q '^IMPORT_ROOT=' "$ENV_FILE"; then
  printf 'IMPORT_ROOT=%s/imports\n' "$DATA_DIR" >> "$ENV_FILE"
fi

echo "Provisioned Mistake Atlas database, service account, and private data directories."
