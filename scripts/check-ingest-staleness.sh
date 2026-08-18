#!/usr/bin/env bash
#
# Log ingest staleness detector (TASK-LOG-004).
#
# Ingest is opt-in. A service that stops POSTing just disappears from the sink, which
# looks identical to a service that is idle. On 2026-07-06 eleven senders stopped at
# once (ingest auth enforced without issuing credentials) and nobody noticed for six
# weeks. This turns that silence into an alert.
#
# Queries GET /api/logs/coverage inside the pod (503 = degraded) and reports stale or
# missing senders to the Telegram digest via the shared notifier.
#
# Usage:
#   ./scripts/check-ingest-staleness.sh            # alert on degraded coverage
#   ./scripts/check-ingest-staleness.sh --dry-run  # print, never notify
#
# Intended to run from cron/CI. Exit codes: 0 healthy, 1 degraded, 2 check failed.

set -euo pipefail

NAMESPACE="${NAMESPACE:-statex-apps}"
DEPLOYMENT="${DEPLOYMENT:-logging-microservice}"
COVERAGE_URL="${COVERAGE_URL:-https://logging.alfares.cz/api/logs/coverage}"
NOTIFY="${NOTIFY:-/home/ssf/Documents/Github/shared/scripts/deploy-queue/notify.sh}"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) echo "[staleness] unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# /api/logs/coverage is behind AdminRoleGuard, which validates against auth-microservice
# and requires a global:superadmin / internal:logging-microservice:admin role. The pod's
# ingest JWT_TOKEN is NOT accepted (returns 401) — use the admin token that
# shared/scripts/rotate-logging-admin-token.sh keeps fresh. Never print it.
TOKEN_FILE="${LOGGING_ADMIN_TOKEN_FILE:-$HOME/.claude/logging-admin-token}"
if [ ! -r "$TOKEN_FILE" ]; then
  echo "[staleness] admin token not readable at $TOKEN_FILE" >&2
  echo "[staleness] run shared/scripts/rotate-logging-admin-token.sh to mint one" >&2
  exit 2
fi
ADMIN_TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
if [ -z "$ADMIN_TOKEN" ]; then
  echo "[staleness] admin token file $TOKEN_FILE is empty" >&2
  exit 2
fi

response="$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$COVERAGE_URL" 2>/dev/null)" || {
  echo "[staleness] FAILED to reach $COVERAGE_URL" >&2
  exit 2
}

http_code="$(printf '%s' "$response" | tail -n1)"
body="$(printf '%s' "$response" | sed '$d')"

if [ -z "$http_code" ]; then
  echo "[staleness] no HTTP status returned from coverage endpoint" >&2
  exit 2
fi

# 200 healthy, 503 degraded-but-answered. Anything else is a broken check, not a verdict —
# never treat it as "healthy".
if [ "$http_code" != "200" ] && [ "$http_code" != "503" ]; then
  echo "[staleness] coverage endpoint returned HTTP $http_code" >&2
  echo "$body" >&2
  exit 2
fi

if [ "$http_code" = "200" ]; then
  echo "[staleness] OK — all known senders shipping within threshold"
  exit 0
fi

# Parse with python3, not grep: an empty "missing" array made `grep -v` exit 1 and
# `set -e` killed the script before it could report anything — a silent failure in
# the very thing meant to break silence.
parsed="$(printf '%s' "$body" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin).get("data", {})
except Exception as exc:
    print("PARSE_ERROR", exc, file=sys.stderr)
    sys.exit(3)
stale = sorted(d.get("stale", []), key=lambda s: -s.get("age_hours", 0))
items = ["%s (%.0fh)" % (s.get("service", "?"), s.get("age_hours", 0)) for s in stale]
print("STALE\t" + ", ".join(items))
print("MISSING\t" + ", ".join(d.get("missing", [])))
s = d.get("summary", {})
print("SUMMARY\t%d shipping / %d stale / %d missing" % (
    s.get("shipping", 0), s.get("stale", 0), s.get("missing", 0)))
')" || {
  echo "[staleness] failed to parse coverage response" >&2
  exit 2
}

stale="$(printf '%s' "$parsed"   | awk -F'\t' '$1=="STALE"{print $2}')"
missing="$(printf '%s' "$parsed" | awk -F'\t' '$1=="MISSING"{print $2}')"
summary="$(printf '%s' "$parsed" | awk -F'\t' '$1=="SUMMARY"{print $2}')"

message="⚠️ logging-microservice ingest coverage degraded
$summary"
[ -n "$stale" ]   && message="$message
Stale (stopped shipping): $stale"
[ -n "$missing" ] && message="$message
Missing (never shipped): $missing"
message="$message
Check: curl -s -H \"Authorization: Bearer \\\$(cat ~/.claude/logging-admin-token)\" $COVERAGE_URL"

echo "[staleness] DEGRADED"
echo "$message"

if [ "$DRY_RUN" = "1" ]; then
  echo "[staleness] --dry-run: not notifying"
  exit 1
fi

if [ -x "$NOTIFY" ]; then
  "$NOTIFY" "$message" || echo "[staleness] notifier failed — degraded state still reported above" >&2
else
  echo "[staleness] notifier not executable at $NOTIFY — cannot send Telegram alert" >&2
fi

exit 1
