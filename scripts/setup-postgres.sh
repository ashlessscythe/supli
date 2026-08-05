#!/usr/bin/env bash
# Create the local Supli Postgres role + database (bare-metal / host Postgres).
# Safe to re-run. Requires psql access as a superuser (default: postgres via peer/sudo).
#
# Usage:
#   ./scripts/setup-postgres.sh
#   DB_USER=supli DB_PASS=supli DB_NAME=supli ./scripts/setup-postgres.sh
#   PSQL_SUPERUSER=postgres ./scripts/setup-postgres.sh

set -euo pipefail

DB_USER="${DB_USER:-supli}"
DB_PASS="${DB_PASS:-supli}"
DB_NAME="${DB_NAME:-supli}"
PSQL_SUPERUSER="${PSQL_SUPERUSER:-postgres}"

run_psql() {
  if [[ "$(id -un)" == "$PSQL_SUPERUSER" ]]; then
    psql -v ON_ERROR_STOP=1 "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo -u "$PSQL_SUPERUSER" psql -v ON_ERROR_STOP=1 "$@"
  else
    echo "Need to run as $PSQL_SUPERUSER or with sudo." >&2
    exit 1
  fi
}

echo "Ensuring role '$DB_USER' and database '$DB_NAME' exist..."

run_psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

run_psql -d "$DB_NAME" <<SQL
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER SCHEMA public OWNER TO ${DB_USER};
SQL

echo "Done."
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?sslmode=disable"
