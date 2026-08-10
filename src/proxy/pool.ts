/**
 * The residential proxy pool, resolved from Webshare at runtime rather than from a
 * hardcoded CSV.
 *
 * ## Why this exists
 *
 * `FLARESOLVERR_PROXY_URL` is a CSV of endpoints, set by hand. Webshare rotates the
 * endpoints under the plan, and the env var does not follow. Measured across nine days:
 *
 *   2026-08-01 (ENG-491)   4 endpoints dead — 216.98.255.6, 9.142.9.177, 9.142.8.166,
 *                          9.142.15.109. All four absent from the plan by 08-10.
 *   2026-08-09 (ENG-668)   7 endpoints returning HTTP 407 — every one absent from the
 *                          plan. The 11 that worked were all still in it.
 *
 * At least 11 of 20 endpoints rotated in nine days, and the entire 9.142.* range was
 * replaced by 9.249.*. Both times the symptom was "flaky proxies", both times it was
 * investigated as a pool-health problem, and both times the cause was a stale env var.
 *
 * The second incident cost a measured 38% failure rate on HLTV's schedule poll: seven of
 * eighteen listed endpoints no longer belonged to the account, so roughly 39% of requests
 * were routed to endpoints that would reject them.
 *
 * Fetching the list makes that class of drift structurally impossible instead of
 * repeatedly detectable.
 *
 * ## What this does NOT replace
 *
 * Per-endpoint health (`proxy-health` in huddle-data) still matters and is unchanged. A
 * freshly fetched list can still contain an endpoint that is down. These solve different
 * problems: this one removes endpoints we no longer rent, that one backs off endpoints
 * that are not answering.
 *
 * ## Ordering is load-bearing
 *
 * The first entry is the pinned egress: `byparr-wrapper` derives `PROXY_SERVER` from it
 * and cycletls replays `cf_clearance` through the same IP. Webshare's download endpoint
 * returns a byte-stable order (verified by fetching twice), so entry #1 is well defined —
 * but this module preserves the upstream order rather than sorting, so both consumers
 * make the same pick from the same bytes.
 */

/** Env var holding the Webshare download URL. Never hardcode the URL itself: it carries a
 *  long-lived account token and belongs in the secret store with everything else. */
export const PROXY_LIST_URL_ENV = 'WEBSHARE_PROXY_LIST_URL';

/** Env var holding the hand-maintained CSV. Retained as the fallback, not the source. */
export const PROXY_CSV_ENV = 'FLARESOLVERR_PROXY_URL';

/** How long a fetched list is reused before refetching. */
const TTL_MS = 60 * 60_000;

/**
 * Refuse a list that collapses.
 *
 * A truncated response, an auth error rendered as a body, or a plan being resized would
 * otherwise silently shrink the pool to a handful of endpoints — which looks exactly like
 * the outage this module exists to prevent, only self-inflicted. Below this we keep what
 * we already had.
 */
const MIN_PLAUSIBLE_ENDPOINTS = 5;

export interface ProxyPool {
  /** `http://user:pass@host:port`, upstream order preserved. */
  urls: string[];
  source: 'webshare' | 'env' | 'empty';
  fetchedAt: number;
}

let cached: ProxyPool | null = null;
let inFlight: Promise<ProxyPool> | null = null;

/** Webshare's `username/direct` download format is `ip:port:user:pass` per line. */
export function parseWebshareList(body: string): string[] {
  const urls: string[] = [];
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const p = t.split(':');
    if (p.length < 4) continue;
    const [ip, port, user, ...rest] = p;
    const pass = rest.join(':');
    if (!ip || !port || !user || !pass) continue;
    urls.push(`http://${user}:${pass}@${ip}:${port}`);
  }
  return urls;
}

/** The hand-maintained CSV, used as fallback. Accepts whitespace and trailing commas. */
export function parseCsvList(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function envPool(): ProxyPool {
  const urls = parseCsvList(process.env[PROXY_CSV_ENV] ?? '');
  return { urls, source: urls.length > 0 ? 'env' : 'empty', fetchedAt: Date.now() };
}

/**
 * Resolve the pool, preferring Webshare and falling back to the CSV.
 *
 * Never throws and never returns an empty list while the env var holds one: an unreachable
 * Webshare must degrade to yesterday's behaviour, not to no proxies at all. That is the
 * whole reason the CSV stays.
 */
export async function getProxyPool(opts: { now?: number; fetchImpl?: typeof fetch } = {}): Promise<ProxyPool> {
  const now = opts.now ?? Date.now();
  if (cached && now - cached.fetchedAt < TTL_MS) return cached;
  if (inFlight) return inFlight;

  const listUrl = process.env[PROXY_LIST_URL_ENV];
  if (!listUrl) {
    cached = envPool();
    return cached;
  }

  const doFetch = opts.fetchImpl ?? fetch;
  inFlight = (async (): Promise<ProxyPool> => {
    try {
      const res = await doFetch(listUrl, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`webshare list HTTP ${res.status}`);
      const urls = parseWebshareList(await res.text());
      if (urls.length < MIN_PLAUSIBLE_ENDPOINTS) {
        throw new Error(`webshare list returned ${urls.length} endpoints — refusing to shrink the pool`);
      }
      cached = { urls, source: 'webshare', fetchedAt: now };
      return cached;
    } catch {
      // Keep a good list rather than replacing it with a bad one. Only fall back to the
      // env var when there is nothing cached to keep.
      if (cached) {
        cached = { ...cached, fetchedAt: now };
        return cached;
      }
      cached = envPool();
      return cached;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Last resolved pool without touching the network. Empty before the first resolve. */
export function peekProxyPool(): ProxyPool | null {
  return cached;
}

export function __resetProxyPoolForTests(): void {
  cached = null;
  inFlight = null;
}
