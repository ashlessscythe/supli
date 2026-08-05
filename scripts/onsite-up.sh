#!/usr/bin/env bash
# One-shot onsite bring-up for Supli Mart on a LAN / air-gapped host.
#
# Modes:
#   --docker-db     Start Postgres via Docker Compose (default if docker works)
#   --host-db       Use bare-metal / host Postgres (runs scripts/setup-postgres.sh)
#   --full          Also run the app in Docker (--profile full)
#   --seed          Seed demo users after migrate
#   --migrate-only  Only ensure DB + migrate (no npm run dev / start)
#
# Examples:
#   ./scripts/onsite-up.sh --docker-db --seed
#   ./scripts/onsite-up.sh --host-db --seed
#   ./scripts/onsite-up.sh --full --seed

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE_DB="auto"
FULL=0
SEED=0
MIGRATE_ONLY=0

usage() {
  sed -n '2,18p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --docker-db) MODE_DB="docker" ;;
    --host-db) MODE_DB="host" ;;
    --full) FULL=1; MODE_DB="docker" ;;
    --seed) SEED=1 ;;
    --migrate-only) MIGRATE_ONLY=1 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
  shift
done

if [[ ! -f .env ]]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  if command -v openssl >/dev/null 2>&1; then
    secret="$(openssl rand -base64 32)"
    # portable in-place replace for NEXTAUTH_SECRET
    tmp="$(mktemp)"
    awk -v s="$secret" '
      /^NEXTAUTH_SECRET=/ { print "NEXTAUTH_SECRET=\"" s "\""; next }
      { print }
    ' .env >"$tmp" && mv "$tmp" .env
    echo "Generated NEXTAUTH_SECRET in .env"
  else
    echo "Set NEXTAUTH_SECRET in .env before continuing." >&2
    exit 1
  fi
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

: "${DATABASE_URL:?DATABASE_URL missing in .env}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET missing in .env}"
: "${NEXTAUTH_URL:=http://localhost:3000}"

docker_ok() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

if [[ "$MODE_DB" == "auto" ]]; then
  if docker_ok; then
    MODE_DB="docker"
  else
    MODE_DB="host"
    echo "Docker not available; using host Postgres."
  fi
fi

if [[ "$FULL" -eq 1 ]]; then
  if ! docker_ok; then
    echo "Docker is required for --full." >&2
    exit 1
  fi
  echo "Starting full Docker stack (postgres + app)..."
  docker compose --profile full up -d --build --wait
  if [[ "$SEED" -eq 1 ]]; then
    docker compose --profile full run --rm app npm run db:seed
  fi
  echo "Onsite stack ready at ${NEXTAUTH_URL}"
  exit 0
fi

if [[ "$MODE_DB" == "docker" ]]; then
  if ! docker_ok; then
    echo "Docker is not running. Start Docker or use --host-db." >&2
    exit 1
  fi
  echo "Starting Docker Postgres..."
  docker compose up -d postgres --wait
else
  echo "Ensuring host Postgres role/database..."
  "$ROOT/scripts/setup-postgres.sh"
fi

if [[ ! -d node_modules ]]; then
  echo "Installing npm dependencies..."
  npm ci
fi

echo "Applying migrations..."
npx prisma migrate deploy

if [[ "$SEED" -eq 1 ]]; then
  echo "Seeding demo data..."
  npm run db:seed
fi

if [[ "$MIGRATE_ONLY" -eq 1 ]]; then
  echo "DB ready (migrate-only)."
  exit 0
fi

echo "Database ready. Start the app with one of:"
echo "  npm run dev      # development"
echo "  npm run build && npm start   # production"
echo "Or install deploy/supli.service for systemd."
echo "App URL: ${NEXTAUTH_URL}"
