"""Serialise Camoufox launches to one at a time (ENG-700).

Appended to Byparr's `src/utils.py` at image build time. Kept as a file rather than a
`sed` one-liner because it adds a function, and a multi-line structural change written
as an in-place edit is the kind nobody can review.

## Why

Byparr's `get_camoufox` is a FastAPI dependency with `yield`, so it launches **a whole
new Camoufox — a full Firefox — on every request**, and there is no pool, no semaphore
and no limit anywhere in the image. `src/consts.py` exposes LOG_LEVEL, VERSION, the
PROXY_* trio, HOST and PORT. There is no concurrency knob to set.

Two clients call this service: huddle-data's CS2 reference cycle (`/stats/teams/...`)
and the demo/match fetcher (`/matches/...`). When their requests overlap, two Firefoxes
run at once and the container exceeds its 2 GiB limit.

Measured on production, 2026-08-11, from Render's events API rather than from the logs:

    server_failed events, 2026-08-10 03:36 → 2026-08-11 18:48
      oomKilled  {"memoryLimit": "2Gi"}   34
      nonZeroExit 137 (SIGKILL)            1
      ------------------------------------ --
      total                                35

35 of 35. Not "restarts", not "timeouts" — the kernel killing the process for memory,
every single time. Nothing appears in the container's own logs because SIGKILL gives it
no chance to write anything, which is why this read as a mysterious silent restart for
so long and why ENG-700's first hypothesis was recorded as unverified.

## Why a semaphore and not a bigger plan

A bigger plan raises the number of concurrent browsers the container survives; it does
not bound it. The next time three requests overlap, or Firefox's footprint grows, the
same failure returns at the new limit. One browser at a time is a bound.

It also matches what this service is for. Byparr exists to mint a `cf_clearance` cookie;
huddle-data replays that cookie through cycletls for the actual fetches. Minting is not
a throughput problem, and a queued request is strictly better than a refused one — today
every overlapping request fails, because the OOM kills the in-flight solve too.

## Why not uvicorn --limit-concurrency

That returns 503 to the excess rather than queueing it, converting an OOM into a refusal.
Callers see `ECONNREFUSED`'s cousin instead of waiting a few seconds. A semaphore makes
them wait, which is what they want.

## The failure mode this introduces, stated plainly

Requests now queue, so a slow solve delays everything behind it. Byparr's own
`max_timeout` per request still applies, so a wedged solve cannot block the queue
indefinitely — it fails and releases. The trade is latency for liveness, and liveness is
currently zero: `cs2/team_stats` read 0 of 30 teams for over four hours.
"""

import asyncio as _hb_asyncio
from collections.abc import AsyncGenerator as _HbAsyncGenerator
from typing import Annotated as _HbAnnotated

from fastapi import Header as _HbHeader

# One browser at a time, process-wide. Byparr runs a single uvicorn worker, so a
# process-wide semaphore is the whole service.
_HB_BROWSER_SEM = _hb_asyncio.Semaphore(1)

_hb_inner_get_camoufox = _hb_inner_get_camoufox  # noqa: F821, PLW0127  (renamed by the Dockerfile's sed)


async def get_camoufox(  # noqa: F811
    x_proxy_server: _HbAnnotated[
        str | None,
        _HbHeader(
            alias="X-Proxy-Server",
            description="Override proxy server for this request in protocol://host:port format.",
        ),
    ] = None,
    x_proxy_username: _HbAnnotated[str | None, _HbHeader(alias="X-Proxy-Username")] = None,
    x_proxy_password: _HbAnnotated[str | None, _HbHeader(alias="X-Proxy-Password")] = None,
) -> _HbAsyncGenerator[CamoufoxDepClass]:  # noqa: F821
    """Get a Camoufox instance, one caller at a time.

    The signature is repeated in full rather than wrapped with `functools.wraps`. FastAPI
    resolves dependencies by inspecting the signature, and a `*args, **kwargs` wrapper
    silently drops the `Header()` annotations — the X-Proxy-* overrides would stop being
    read and nothing would fail loudly. Written out, a signature change upstream is caught
    by the Dockerfile's grep guard instead.

    `anext` then an explicit `aclose` in a `finally`, rather than `async for`. Leaving the
    loop does NOT finalise an async generator — it is left suspended and its cleanup runs
    whenever the collector gets to it. Written as `async for`, this measured a peak of two
    concurrent browsers against four callers: the semaphore was released on time and the
    browser behind it was not, so the thing being bounded outlived the bound. `aclose()`
    throws GeneratorExit at the inner `yield`, which unwinds `async with AsyncCamoufox(...)`
    and shuts the browser down before this frame releases the semaphore.
    """
    async with _HB_BROWSER_SEM:
        _inner = _hb_inner_get_camoufox(
            x_proxy_server, x_proxy_username, x_proxy_password
        )
        try:
            yield await anext(_inner)
        finally:
            await _inner.aclose()
