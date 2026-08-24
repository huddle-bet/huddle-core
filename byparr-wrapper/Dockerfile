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

# Make Byparr's own timeout handler reachable (ENG-748).
#
# `endpoints.py` already returns the right thing when a solve runs out of time:
#
#     except TimeoutError as e:
#         logger.error("Timed out while solving the challenge")
#         raise HTTPException(status_code=408, detail="Timed out while solving the challenge")
#
# That branch never runs. `except TimeoutError` binds the *builtin*, and the only timeouts
# that actually fire inside the try are Playwright's — `page.goto`, two
# `wait_for_load_state` calls — which raise `playwright._impl._errors.TimeoutError`.
# Verified against the pinned digest:
#
#     MRO: TimeoutError -> Error -> Exception -> BaseException -> object
#     issubclass(playwright TimeoutError, builtins.TimeoutError) == False
#
# So the exception escapes the handler, FastAPI turns it into an unhandled ASGI exception,
# and the caller gets a **500 with a traceback** instead of a 408. Measured 2026-08-12:
# 19 such 500s in 16 minutes, every terminal exception a Playwright TimeoutError.
#
# The cost is not the status code. A 500 says "this service is broken" and a 408 says "this
# page did not finish in time" — so a routine unsolved challenge is indistinguishable from a
# dead solver, and every caller has to treat both as a transport fault. That ambiguity cost
# real diagnosis time twice in one day: ENG-742 had to infer solve health from downstream
# write counts, and these 500s were first read as a cold-start spell after a restart that
# had happened an hour earlier.
#
# Only the builtin is left in place for `asyncio.wait_for` around the captcha solve, which
# genuinely does raise it — so both are caught rather than one swapped for the other.
#
# Guarded both ways like the geoip patch: if the pin moves to an image that rewords this
# handler, the build fails loud rather than silently shipping the unreachable branch again.
RUN grep -q '^from playwright_captcha import CaptchaType$' /app/src/endpoints.py \
    && sed -i 's|^from playwright_captcha import CaptchaType$|from playwright.async_api import TimeoutError as PlaywrightTimeoutError\nfrom playwright_captcha import CaptchaType|' /app/src/endpoints.py \
    && grep -q '^    except TimeoutError as e:$' /app/src/endpoints.py \
    && sed -i 's|^    except TimeoutError as e:$|    except (TimeoutError, PlaywrightTimeoutError) as e:|' /app/src/endpoints.py \
    && grep -q '^    except (TimeoutError, PlaywrightTimeoutError) as e:$' /app/src/endpoints.py \
    && grep -q '^from playwright.async_api import TimeoutError as PlaywrightTimeoutError$' /app/src/endpoints.py \
    && /app/.venv/bin/python -c "import ast,sys; ast.parse(open('/app/src/endpoints.py').read())"

# Bound the `networkidle` wait, and make it non-fatal (2026-08-24).
#
# THE SOLVER WAS NOT FAILING TO SOLVE CHALLENGES. It was timing out before it ever looked for
# one. `endpoints.py` runs, in order:
#
#     await dep.page.goto(request.url, timeout=timer.remaining() * 1000)
#     await dep.page.wait_for_load_state("domcontentloaded", timeout=timer.remaining() * 1000)
#     await dep.page.wait_for_load_state("networkidle",      timeout=timer.remaining() * 1000)
#     ...
#     if await dep.page.title() in CHALLENGE_TITLES:
#         logger.info("Challenge detected, attempting to solve...")
#
# The networkidle wait is handed the ENTIRE remaining budget, and challenge detection happens
# after it. hltv.org match pages carry ads and trackers that keep connections open, so
# networkidle never fires, the budget drains, and the request 408s having never read the title.
#
# The logs say exactly that. Over 2026-08-24 04:00-09:00 UTC, every one of the 6 failures
# logged `Timed out while solving the challenge` with NO `Challenge detected` line before it.
# The single request that DID log `Challenge detected` succeeded, in 20.43s.
#
# It also explains the shape that made the budget look irrelevant. Measured over the 16.5h
# after the `max_timeout` field fix landed:
#
#   succeeded  n=6    11.8 20.2 20.4 20.4 21.7 27.8s      — page settled, challenge read
#   failed     n=12   153.1 ... 157.0s                    — networkidle never fired
#
# 66.7% failure on a 150s budget against 63.8% on 60s. Bimodal, because the failing branch is
# not racing the clock at all — it is waiting on an event that will never arrive, so it
# consumes whatever budget it is given. That is why 2.5x more time recovered nothing.
#
# `domcontentloaded` has already returned one line above, which is all `page.title()` needs, so
# nothing downstream depends on networkidle having settled. Bounded to 5s and suppressed: a
# page that settles quickly still gets the benefit, and one that never settles costs 5s instead
# of the entire budget.
#
# Patched in Python rather than sed because the call spans three lines and sed is line-oriented.
# Guarded both ways like the patches above: the build FAILS if the pattern is absent, so a
# moved pin cannot silently ship the unbounded wait again.
RUN /app/.venv/bin/python - <<'PATCH'
import re, sys, ast
p = "/app/src/endpoints.py"
src = open(p).read()
pat = re.compile(
    r"([ \t]*)await dep\.page\.wait_for_load_state\(\s*\n?\s*[\"']networkidle[\"'],\s*timeout=timer\.remaining\(\) \* 1000,?\s*\n?\s*\)",
    re.M,
)
m = pat.search(src)
if not m:
    sys.exit("byparr-wrapper: networkidle wait not found — pin moved, refusing to build")
indent = m.group(1)
repl = (
    f"{indent}try:\n"
    f"{indent}    await dep.page.wait_for_load_state(\"networkidle\", timeout=5000)\n"
    f"{indent}except Exception:\n"
    f"{indent}    pass  # huddle: never block challenge detection on an event hltv never emits\n"
)
src = src[:m.start()] + repl.rstrip("\n") + src[m.end():]
ast.parse(src)
open(p, "w").write(src)
if "timeout=5000" not in open(p).read():
    sys.exit("byparr-wrapper: networkidle patch did not apply")
print("byparr-wrapper: networkidle wait bounded to 5s and suppressed")
PATCH

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
