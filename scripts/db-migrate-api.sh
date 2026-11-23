#!/usr/bin/env bash
# db-migrate.sh over HTTPS: applies new migrations and the content seed through the Supabase Management API
# instead of a Postgres connection, for when GitHub Actions cannot run. Same bookkeeping as db-migrate.sh, so
# the workflow later skips what this applied: each migration once, sent in one request (one transaction)
# together with its row in private.migrations.
# Needs SUPABASE_PROJECT_REF and an access token with database read-write: SUPABASE_ACCESS_TOKEN, or the token
# the network proxy of a Claude cloud session adds.
set -euo pipefail
: "${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF (the part before .supabase.co in the Project URL)}"
api="${SUPABASE_API_URL:-https://api.supabase.com}/v1/projects/$SUPABASE_PROJECT_REF/database/query"

# Sends the SQL on stdin as one request and prints the rows of its last statement as JSON.
sql() {
  local out
  sleep 1 # the Management API allows 60 requests a minute
  if ! out=$(jq -Rs '{query: .}' | curl -sS --fail-with-body -X POST "$api" -H 'Content-Type: application/json' \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:-added-by-proxy}" --data-binary @-); then
    echo "$out" >&2
    return 1
  fi
  printf '%s\n' "$out"
}

# The workflow deploys as postgres; objects created by another role could not be replaced by it later.
user=$(sql <<< 'select current_user as u' | jq -r '.[0].u')
[ "$user" = postgres ] || { echo "the API runs as '$user', not postgres; stopping" >&2; exit 1; }

sql <<'SQL' > /dev/null
create schema if not exists private;
create table if not exists private.migrations (name text primary key, applied_at timestamptz not null default now())
SQL
applied=$(sql <<< 'select name from private.migrations' | jq -r '.[].name')

for file in supabase/migrations/*.sql; do
  name=$(basename "$file")
  if grep -qxF "$name" <<< "$applied"; then continue; fi
  echo "applying $name"
  { cat "$file"; printf "\n;\ninsert into private.migrations (name) values ('%s');\n" "$name"; } | sql > /dev/null
done

for file in supabase/seed/*.sql; do
  echo "seeding $(basename "$file")"
  sql < "$file" > /dev/null
done
echo "database is up to date"
