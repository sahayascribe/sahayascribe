#!/usr/bin/env bash
# Runs the Supabase migrations and RLS tests against a throwaway local Postgres.
# Requires Postgres 15+ binaries (initdb, pg_ctl, psql) on PATH or under
# /usr/lib/postgresql/<version>/bin.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | sort -V | tail -1)")"
WORK="$(mktemp -d)"
PORT="${TEST_DB_PORT:-54329}"
RUN=()
if [ "$(id -u)" = "0" ]; then
  # Postgres refuses to run as root.
  chown postgres "$WORK"
  RUN=(runuser -u postgres --)
fi

cleanup() {
  "${RUN[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${RUN[@]}" "$PG_BIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUN[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null

PSQL=("${RUN[@]}" "$PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d postgres)
"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase_stub.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261018000001_core_schema.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261019000001_notifications.sql"
# The storage migration is applied inside the test so storage policies are exercised too.
(cd "$ROOT/supabase/tests" && "${PSQL[@]}" -f rls_test.sql)
