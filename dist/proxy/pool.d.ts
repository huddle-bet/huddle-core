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
export declare const PROXY_LIST_URL_ENV = "WEBSHARE_PROXY_LIST_URL";
/** Env var holding the hand-maintained CSV. Retained as the fallback, not the source. */
export declare const PROXY_CSV_ENV = "FLARESOLVERR_PROXY_URL";
export interface ProxyPool {
    /** `http://user:pass@host:port`, upstream order preserved. */
    urls: string[];
    source: 'webshare' | 'env' | 'empty';
    fetchedAt: number;
}
/** Webshare's `username/direct` download format is `ip:port:user:pass` per line. */
export declare function parseWebshareList(body: string): string[];
/** The hand-maintained CSV, used as fallback. Accepts whitespace and trailing commas. */
export declare function parseCsvList(raw: string): string[];
/**
 * Resolve the pool, preferring Webshare and falling back to the CSV.
 *
 * Never throws and never returns an empty list while the env var holds one: an unreachable
 * Webshare must degrade to yesterday's behaviour, not to no proxies at all. That is the
 * whole reason the CSV stays.
 */
export declare function getProxyPool(opts?: {
    now?: number;
    fetchImpl?: typeof fetch;
}): Promise<ProxyPool>;
/** Last resolved pool without touching the network. Empty before the first resolve. */
export declare function peekProxyPool(): ProxyPool | null;
export declare function __resetProxyPoolForTests(): void;
//# sourceMappingURL=pool.d.ts.map