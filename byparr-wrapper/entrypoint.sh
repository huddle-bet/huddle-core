#!/bin/sh
set -e

# Derive Byparr's PROXY_* env vars from FLARESOLVERR_PROXY_URL (the
# Webshare CSV pool consumed by all our HLTV clients). Picks the first
# entry deterministically so this container's egress IP matches the IP
# huddle-data's cycletls process pins to — required for cf-session
# cache reuse (cf_clearance is bound to source IP).
#
# Format expected: comma-separated list of `http://user:pass@host:port`
# URLs. We split off the first entry and parse it into the three pieces
# Byparr wants.

# Prefer the live Webshare list over the hand-maintained CSV.
#
# Webshare rotates the endpoints under the plan and the env var does not follow. Measured
# across nine days: 4 went dead by 2026-08-01 (ENG-491) and 7 more returned 407 by
# 2026-08-09 (ENG-668). All eleven were absent from the plan by 08-10, while every endpoint
# that still worked was still in it. Both incidents read as flaky proxies and were a stale
# env var.
#
# Upstream order is preserved so this container's first entry is the same one huddle-data
# pins to — cf_clearance is IP-bound and both sides must agree which IP that is. Webshare's
# download endpoint returns a byte-stable order, verified by fetching twice.
#
# Falls back to the CSV on any failure: a container that cannot reach Webshare must start
# with yesterday's pool rather than with no proxy at all.
POOL_CSV="$FLARESOLVERR_PROXY_URL"
if [ -n "$WEBSHARE_PROXY_LIST_URL" ]; then
  FETCHED=$(curl -fsS --max-time 20 "$WEBSHARE_PROXY_LIST_URL" 2>/dev/null \
    | awk -F: 'NF>=4 && $1 != "" { printf "%shttp://%s:%s@%s:%s", sep, $3, $4, $1, $2; sep="," }')
  COUNT=0
  [ -n "$FETCHED" ] && COUNT=$(printf %s "$FETCHED" | awk -F, '{print NF}')
  # Under five endpoints is a truncated body or an error page, not a resized plan. Keeping
  # the CSV is the safer wrong answer.
  if [ "$COUNT" -ge 5 ]; then
    POOL_CSV="$FETCHED"
    echo "[byparr-wrapper] proxy pool from Webshare: $COUNT endpoints" >&2
  else
    echo "[byparr-wrapper] Webshare list unusable ($COUNT endpoints) — falling back to FLARESOLVERR_PROXY_URL" >&2
  fi
fi

if [ -n "$POOL_CSV" ]; then
  FIRST=$(printf %s "$POOL_CSV" | cut -d, -f1 | tr -d ' ')

  # Strip http(s):// prefix, then split on @ into user:pass and host:port.
  STRIPPED=$(printf %s "$FIRST" | sed -E 's|^https?://||')
  USER_PASS=$(printf %s "$STRIPPED" | cut -d@ -f1)
  HOST_PORT=$(printf %s "$STRIPPED" | cut -d@ -f2-)

  PROXY_USERNAME=$(printf %s "$USER_PASS" | cut -d: -f1)
  PROXY_PASSWORD=$(printf %s "$USER_PASS" | cut -d: -f2-)
  PROXY_SERVER="http://$HOST_PORT"

  export PROXY_SERVER PROXY_USERNAME PROXY_PASSWORD

  echo "[byparr-wrapper] PROXY_SERVER=$PROXY_SERVER (user=$PROXY_USERNAME)" >&2
else
  echo "[byparr-wrapper] no proxy pool (WEBSHARE_PROXY_LIST_URL and FLARESOLVERR_PROXY_URL both unset) — Byparr will egress direct" >&2
fi

exec /app/.venv/bin/python main.py "$@"
