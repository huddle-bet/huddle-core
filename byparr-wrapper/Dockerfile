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

# Pinned to the v2.1.0 release by digest, because `:latest` floated to 3.0.0 and
# 3.0.0 does not solve HLTV.
#
# 3.0.0 replaced Camoufox with `invisible_playwright` + `playwright_captcha`.
# Measured on the same proxy, the same Webshare account and the same URLs, either
# side of the 2026-08-08 19:38 cutover when the new image went live:
#
#   Byparr 2.1.0   08-03 22:49 → 08-08 19:38   167 challenges   170x HTTP 200    6 timeouts
#   Byparr 3.0.0   08-08 19:38 → 08-09 16:10    95 challenges     0x HTTP 200   78 timeouts
#
# Not one solve in 95 attempts, each burning ~95s before timing out. Downstream
# that is total: huddle-data captured zero cf-sessions in 20.5 hours, so every
# CS2 demo fetch threw `cf-session-cache empty` and `cs2_round_player_stats` and
# `match_round_economy` took zero rows for the whole run.
#
# A tag is not a pin — `2.1.0` could be re-pushed. The digest cannot, which is
# the actual lesson of the 3.0.0 incident: nothing here changed on our side, and
# the solver still stopped working.
#
# Moving forward again means proving a candidate image solves before it ships,
# not reading its release notes. `test-local.sh` is that proof.
FROM ghcr.io/thephaseless/byparr@sha256:01a46a2865d9a6db5eb8ead04ec0dd33b8fbe233e8565ae70b50d4cc0af4cfb0

USER root
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Patch out Camoufox's geoip lookup (Byparr passes geoip=True to AsyncCamoufox in
# src/utils.py:97). With geoip=True, every browser launch fires an extra request
# to api.ipify.org *through the proxy* just to detect locale — doubling our
# Webshare CONNECT-tunnel rate for no benefit (cf_clearance binds to the actual
# egress IP, not whatever locale Camoufox infers). Under load this trips
# Webshare's 429 at the proxy gateway and the browser fails to launch with
# InvalidProxy before HLTV is even contacted.
#
# The sed targets the literal `geoip=True,` line — single occurrence in utils.py,
# unambiguous. Re-verified against the pinned digest 2026-08-09. If the pin ever
# moves to an image that renames the kwarg, the build fails loud (RUN exits
# non-zero) instead of silently regressing. That guard is what caught 3.0.0.
RUN grep -q '        geoip=True,' /app/src/utils.py \
    && sed -i 's|        geoip=True,|        geoip=False,|' /app/src/utils.py \
    && grep -q '        geoip=False,' /app/src/utils.py

# Serialise browser launches — one Camoufox at a time (ENG-700).
#
# Byparr's `get_camoufox` is a FastAPI dependency with `yield`, so it starts a whole new
# Firefox on EVERY request. There is no pool, no semaphore and no limit in the image, and
# `src/consts.py` exposes no knob to add one — LOG_LEVEL, VERSION, PROXY_*, HOST, PORT.
#
# Two clients call this service and their requests overlap: huddle-data's CS2 reference
# cycle on /stats/teams/... and the demo fetcher on /matches/.... Two Firefoxes exceed the
# 2 GiB the standard plan gives us, and the kernel kills the process.
#
# Measured 2026-08-11 from Render's events API, not from the container's logs:
#
#     server_failed, 2026-08-10 03:36 → 2026-08-11 18:48
#       oomKilled {"memoryLimit": "2Gi"}   34
#       nonZeroExit 137 (SIGKILL)           1
#       total                              35
#
# 35 of 35. The logs show nothing before each death because SIGKILL leaves no chance to
# write, which is exactly why this looked like an unexplained restart for two days.
#
# A larger plan would raise the number of concurrent browsers we survive without bounding
# it; the same failure returns at the new ceiling. One at a time is a bound. Byparr's job
# is to mint a cf_clearance cookie that cycletls then replays — that is not a throughput
# problem, and a queued request beats a refused one. Today the OOM kills the in-flight
# solve as well as the arriving one, so overlapping requests currently fail BOTH.
#
# The sed renames the original; serialise-browsers.py appends a replacement carrying the
# same explicit signature. Two grep guards, before and after, so a rename upstream fails
# the build loud rather than appending a wrapper that shadows nothing.
COPY serialise-browsers.py /tmp/serialise-browsers.py
RUN grep -q '^async def get_camoufox(' /app/src/utils.py \
    && sed -i 's|^async def get_camoufox(|async def _hb_inner_get_camoufox(|' /app/src/utils.py \
    && grep -q '^async def _hb_inner_get_camoufox(' /app/src/utils.py \
    && ! grep -q '^async def get_camoufox(' /app/src/utils.py \
    && cat /tmp/serialise-browsers.py >> /app/src/utils.py \
    && rm /tmp/serialise-browsers.py \
    && grep -q '_HB_BROWSER_SEM' /app/src/utils.py \
    && /app/.venv/bin/python -c "import ast; ast.parse(open('/app/src/utils.py').read())"
# `/app/.venv/bin/python`, not `python3` — there is no python on PATH in this image. The
# venv symlinks to a uv-managed CPython under /home/ubuntu/.local/share/uv/python, and a
# bare `python3` here exits 127, which reads as a failed guard rather than a missing
# interpreter.

# No interpreter relocation here, and that is deliberate. The /opt/uv-python move
# added for 3.0.0 exists because 3.0.0 sets HOME=/tmp and Render mounts an
# ephemeral /tmp over the image's, masking the CPython tree. 2.1.0 installs to
# /home/ubuntu/.local/share/uv/python, which nothing mounts over — confirmed
# against the pinned digest, including under `docker run --tmpfs /tmp`.

USER 1000
ENTRYPOINT ["/entrypoint.sh"]
