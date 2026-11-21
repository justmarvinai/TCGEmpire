#!/usr/bin/env bash
# Applies new SQL migrations and the content seed to the database in $DATABASE_URL.
# Each migration runs once, in its own transaction; applied files are recorded in private.migrations.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to the Postgres connection string}"

run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

run -c "create schema if not exists private" \
    -c "create table if not exists private.migrations (name text primary key, applied_at timestamptz not null default now())"

for file in supabase/migrations/*.sql; do
  name=$(basename "$file")
  if [ "$(run -tA -c "select 1 from private.migrations where name = '$name'")" = "1" ]; then
    continue
  fi
  echo "applying $name"
  run -1 -f "$file" -c "insert into private.migrations (name) values ('$name')"
done

for file in supabase/seed/*.sql; do
  echo "seeding $(basename "$file")"
  run -1 -f "$file"
done
echo "database is up to date"
