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

# The Camoufox geoip patch that lived here is gone, because Camoufox is.
#
# It rewrote `geoip=True,` to `geoip=False,` in src/utils.py, so that every
# browser launch stopped firing an extra api.ipify.org request *through the
# proxy* purely to infer locale — which under load tripped Webshare's 429 at
# the gateway and failed the launch with InvalidProxy before HLTV was even
# contacted.
#
# Upstream replaced the whole browser stack: Camoufox is no longer installed,
# `AsyncCamoufox` has no call sites, and src/utils.py now drives
# `invisible_playwright` + `playwright_captcha`. There is no `geoip` kwarg left
# to patch, which is why the build broke on 2026-08-08 — the guard fired
# exactly as its comment promised, rather than regressing in silence.
#
# Nothing replaces it. `invisible_core.ensure_geoip_mmdb` resolves locale from
# a local MaxMind file instead of an HTTP round trip, so the behaviour the patch
# existed to prevent is now upstream's default.
#
# One consequence worth knowing rather than patching: `ensure_geoip_mmdb` does a
# permalink HEAD to GitHub on **every** call, and no .mmdb is baked into the
# image — so a cold container downloads one on first launch. That egresses from
# the container, not through PROXY_SERVER (which configures the browser, not
# Python's HTTP client), so it does not consume Webshare tunnels. If GitHub is
# ever unreachable from Render with a cold cache, `ensure_geoip_mmdb` raises and
# the launch fails; `STEALTHFOX_GEOIP_MMDB` can point at a baked-in file if that
# ever bites.

USER 1000
ENTRYPOINT ["/entrypoint.sh"]
