# Wraps the upstream Byparr image with a startup script that derives
# Byparr's PROXY_SERVER / PROXY_USERNAME / PROXY_PASSWORD env vars from
# our existing FLARESOLVERR_PROXY_URL (CSV pool of Webshare residential
# IPs, set sync:false in the huddle-shared envVarGroup).
#
# Why we need this: Byparr only reads PROXY_* from container env, not
# from the FlareSolverr-style per-request `proxy.url` field that our
# huddle-data client used to send. Without a proxy configured, Byparr
# egresses direct from the Render datacenter container IP, which HLTV's
# CF hardblocks for /stats (returns "Attention Required! | Cloudflare").
# Webshare residential IPs serve the solvable "Just a moment..." JS
# challenge that Byparr's Camoufox stack can pass.
#
# The CSV's first entry is picked deterministically — same as
# huddle-data's resolveCycletlsProxyUrl — so cycletls and Byparr end up
# on the same egress IP. That's required for cf-session caching to
# work (cf_clearance is bound to the source IP; Byparr captures it,
# cycletls replays it).

FROM ghcr.io/thephaseless/byparr:latest

USER root
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Patch out Camoufox's geoip lookup (Byparr passes geoip=True to
# AsyncCamoufox in src/utils.py:92). With geoip=True, every browser
# launch fires an extra request to api.ipify.org *through the proxy*
# just to detect locale — doubling our Webshare CONNECT-tunnel rate
# for no benefit (cf_clearance binds to actual egress IP, not
# whatever locale Camoufox infers). Under load this trips Webshare's
# 429 Too Many Requests at the proxy gateway and the browser fails
# to launch with InvalidProxy before HLTV is even contacted.
#
# The sed targets the literal `geoip=True,` line — single occurrence
# in utils.py, unambiguous. Verified against ThePhaseless/byparr@main
# 2026-04-28. If a future image bump renames the kwarg or removes
# the comma, the build fails loud (RUN exits non-zero) instead of
# silently regressing.
RUN grep -q '        geoip=True,' /app/src/utils.py \
    && sed -i 's|        geoip=True,|        geoip=False,|' /app/src/utils.py \
    && grep -q '        geoip=False,' /app/src/utils.py

USER 1000
ENTRYPOINT ["/entrypoint.sh"]
