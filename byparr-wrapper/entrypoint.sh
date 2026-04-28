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

if [ -n "$FLARESOLVERR_PROXY_URL" ]; then
  FIRST=$(printf %s "$FLARESOLVERR_PROXY_URL" | cut -d, -f1 | tr -d ' ')

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
  echo "[byparr-wrapper] FLARESOLVERR_PROXY_URL not set — Byparr will egress direct" >&2
fi

exec /app/.venv/bin/python main.py "$@"
