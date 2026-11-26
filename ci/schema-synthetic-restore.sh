#!/usr/bin/env bash
# Schema migration and pg_dump/pg_restore rehearsal using synthetic fixtures only.
# NEVER connect this job to Railway or a real patient database.
set -Eeuo pipefail
service="${1:?service required}"
case "$service" in auth|reminder|notification) ;; *) echo "Unsupported isolated test service" >&2; exit 2 ;; esac
[[ "${GITHUB_ACTIONS:-}" == "true" ]] || { echo "CI-only; no production execution" >&2; exit 2; }
[[ "${AHA_ISOLATED_DB_TEST:-}" == "true" ]] || { echo "Explicit AHA_ISOLATED_DB_TEST=true required" >&2; exit 2; }
[[ "${PGHOST:-}" == "127.0.0.1" ]] || { echo "Refusing non-loopback database host" >&2; exit 2; }
[[ "${PGPORT:-}" == "5432" ]] || { echo "Unexpected database port" >&2; exit 2; }
db="aha_${service}_fixture"
restored="aha_${service}_restored"
export PGPASSWORD="ci-only-postgres-password-not-production"
PG=(docker run --rm --network host -e PGPASSWORD -v "${RUNNER_TEMP}:/audit" postgres:18-alpine)
psql_ci() { "${PG[@]}" psql --no-psqlrc -X -h 127.0.0.1 -p 5432 -U aha_ci -d "$1" -v ON_ERROR_STOP=1 "${@:2}"; }
psql_ci postgres -c "CREATE DATABASE $db"
psql_ci postgres -c "CREATE DATABASE $restored"
export NODE_ENV=test
export DATABASE_URL="postgresql://aha_ci:ci-only-postgres-password-not-production@127.0.0.1:5432/$db"
  npm --prefix "backend/$service-service" ci --omit=dev --ignore-scripts --no-audit --no-fund
  npm --prefix "backend/$service-service" run migrate
  npm --prefix "backend/$service-service" run migrate
case "$service" in
  auth)
    psql_ci "$db" -c "INSERT INTO users(phone,name,role) VALUES ('0000000001','Synthetic elder','elderly'),('0000000002','Synthetic caregiver','caregiver')"
    psql_ci "$db" -c "INSERT INTO family_connections(requester_id,requested_id,status) SELECT e.id,c.id,'accepted' FROM users e CROSS JOIN users c WHERE e.phone='0000000001' AND c.phone='0000000002'"
    table=family_connections
    expected=1
    ;;
  reminder)
    psql_ci "$db" -c "INSERT INTO reminders(user_id,medicine_name,reminder_time) VALUES ('00000000-0000-4000-8000-000000000001','Synthetic medication','06:45')"
    table=reminders
    expected=1
    ;;
  notification)
    psql_ci "$db" -c "INSERT INTO notifications(user_id,type,title,message) VALUES ('00000000-0000-4000-8000-000000000001','synthetic','CI fixture','CI synthetic notification only')"
    table=notifications
    expected=1
    ;;
esac
test "$(psql_ci "$db" -Atc "SELECT count(*) FROM $table")" = "$expected"
src_tables="$(psql_ci "$db" -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")"
test "$src_tables" -gt 0
"${PG[@]}" pg_dump -h 127.0.0.1 -p 5432 -U aha_ci -d "$db" --format=custom --no-owner --no-acl --file="/audit/$service.dump"
sha256sum "${RUNNER_TEMP}/$service.dump" | cut -d ' ' -f 1 | sed 's/.*/Synthetic backup SHA256: &/'
"${PG[@]}" pg_restore -h 127.0.0.1 -p 5432 -U aha_ci -d "$restored" --no-owner --no-acl --exit-on-error "/audit/$service.dump"
dst_tables="$(psql_ci "$restored" -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")"
test "$dst_tables" = "$src_tables"
test "$(psql_ci "$restored" -Atc "SELECT count(*) FROM $table")" = "$expected"
if [[ "$service" == "auth" ]]; then
  test "$(psql_ci "$restored" -Atc "SELECT count(*) FROM users")" = "2"
  test "$(psql_ci "$restored" -Atc "SELECT count(*) FROM family_connections WHERE status='accepted'")" = "1"
fi
if [[ "$service" == "reminder" ]]; then
  test "$(psql_ci "$restored" -Atc "SELECT count(*) FROM reminders WHERE medicine_name='Synthetic medication'")" = "1"
  test "$(psql_ci "$restored" -Atc "SELECT to_regclass('public.users') IS NULL")" = "t"
fi
echo "PASS $service: isolated migration idempotence; $src_tables tables; synthetic record + pg_dump/restore integrity verified"
rm -f "${RUNNER_TEMP}/$service.dump"
