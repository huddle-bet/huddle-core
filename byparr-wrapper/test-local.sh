#!/bin/sh
# Local smoke test for the byparr-wrapper image. Builds it from this
# directory, runs it with whatever FLARESOLVERR_PROXY_URL is in your
# environment (or no proxy if unset), then POSTs a /stats URL to /v1
# and checks the response.
#
# Run with:
#   FLARESOLVERR_PROXY_URL='http://user:pass@host:port' ./test-local.sh
#
# Or without a proxy (egresses from your home IP — useful for
# verifying the geoip patch eliminates ipify calls, but CF behavior
# on home IP differs from Webshare so a 200 here doesn't 1:1 prove
# prod will work; combine with the proxy run for full validation):
#   ./test-local.sh

set -e

IMG=byparr-wrapper-local
# 8192 not 8191 — local FlareSolverr container typically holds 8191.
# Inside the container Byparr still listens on 8191; we just publish
# it on the host as 8192.
PORT=8192
URL='https://www.hltv.org/stats/matches/mapstatsid/227589/alzon-vs-yawara'

echo "==> Building image..."
docker build -t "$IMG" "$(dirname "$0")"

echo "==> Removing any stale container..."
docker rm -f byparr-test 2>/dev/null || true

echo "==> Starting container (proxy=${FLARESOLVERR_PROXY_URL:-NONE})..."
docker run -d --name byparr-test \
  -p "${PORT}:8191" \
  -e "FLARESOLVERR_PROXY_URL=${FLARESOLVERR_PROXY_URL:-}" \
  "$IMG"

echo "==> Waiting for /v1 to be reachable..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/v1" -X POST \
       -H 'Content-Type: application/json' \
       -d '{"cmd":"sessions.list"}' >/dev/null 2>&1; then
    echo "    up after ${i}s"
    break
  fi
  sleep 1
done

echo "==> Tailing wrapper boot lines..."
docker logs byparr-test 2>&1 | grep -E 'byparr-wrapper|Uvicorn|Started' | head -5

echo ""
echo "==> POST /v1 with cmd=request.get for ${URL}"
echo "    (90s timeout — same as production byparr-client default)"
START=$(date +%s)
RESP_FILE=$(mktemp)
curl -s "http://localhost:${PORT}/v1" \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"cmd\":\"request.get\",\"url\":\"${URL}\",\"maxTimeout\":90}" \
  --max-time 120 \
  -o "$RESP_FILE"
END=$(date +%s)
echo "    took $((END-START))s"

echo ""
echo "==> Response summary:"
# strict=False tolerates the literal control chars HLTV ships in
# embedded data attributes (the actual JSON wire format is fine —
# those control chars are inside the response.solution.response
# string, not in the JSON envelope).
python3 - "$RESP_FILE" <<'PY'
import json, sys
with open(sys.argv[1], 'rb') as f:
    raw = f.read()
d = json.loads(raw, strict=False)
print(f"  status = {d.get('status')}")
print(f"  message = {d.get('message')}")
s = d.get('solution') or {}
print(f"  solution.status = {s.get('status')}")
print(f"  solution.url = {s.get('url')}")
cookies = s.get('cookies') or []
print(f"  cookies = {len(cookies)}")
cookie_names = [c.get('name') for c in cookies]
print(f"  cookie names = {cookie_names}")
html = s.get('response') or ''
print(f"  html_len = {len(html)}")
markers = {
    'cf_clearance_in_cookies': any(c.get('name') == 'cf_clearance' for c in cookies),
    'looks_like_challenge': ('Just a moment' in html
                             or 'Sorry, you have been blocked' in html
                             or 'Attention Required! | Cloudflare' in html),
    'has_real_hltv_marker': 'mapstats' in html.lower() or 'hltv' in html.lower(),
}
print(f"  markers = {markers}")
PY

echo ""
echo "==> Container logs (challenge solve trail):"
docker logs byparr-test 2>&1 | grep -E 'Challenge detected|Done|Timed out|Failed|InvalidProxy|ipify' | tail -20

echo ""
echo "==> Cleanup: docker rm -f byparr-test"
docker rm -f byparr-test
