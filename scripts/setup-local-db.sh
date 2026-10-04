#!/usr/bin/env bash
# One-time local setup: creates the app's Postgres role and database from DATABASE_URL in .env.
# Run with:  bash scripts/setup-local-db.sh   (it will ask for your sudo password)
set -euo pipefail
cd "$(dirname "$0")/.."

url=$(grep -E '^DATABASE_URL=' .env | sed -E 's/^DATABASE_URL="?([^"]*)"?$/\1/')
user=$(echo "$url" | sed -E 's#^postgresql://([^:]+):.*#\1#')
pass=$(echo "$url" | sed -E 's#^postgresql://[^:]+:([^@]+)@.*#\1#')
db=$(echo "$url" | sed -E 's#^.*/([^/?]+)(\?.*)?$#\1#')

# CREATEDB lets `prisma migrate dev` create its temporary shadow database.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${user}') THEN
    CREATE ROLE ${user} LOGIN CREATEDB PASSWORD '${pass}';
  ELSE
    ALTER ROLE ${user} WITH LOGIN CREATEDB PASSWORD '${pass}';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'" | grep -q 1; then
  sudo -u postgres createdb -O "${user}" "${db}"
fi
echo "Ready: database '${db}' owned by role '${user}'."
