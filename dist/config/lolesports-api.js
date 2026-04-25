/**
 * Shared Riot lolesports public API key + self-harvest logic.
 *
 * Riot's unofficial esports-api.lolesports.com feed requires an
 * `x-api-key` header. The same static key is embedded in the
 * lolesports.com front-end bundle and is the one every browser session
 * uses. Riot rotates it irregularly (observed cadence 12–24 months).
 *
 * When the key rotates, every service holding it gets 401/403 on the
 * next call. To avoid an outage:
 *
 *   1. Each call site dispatches normally with `currentApiKey()`.
 *   2. On 401/403, the caller invokes `scrapeApiKey()` which re-fetches
 *      the public lolesports.com main JS bundle, grep-extracts the new
 *      key, and returns it. `setApiKey()` persists it for subsequent
 *      calls in the same process.
 *   3. Throttled to at most one harvest per hour to keep our traffic
 *      on lolesports.com negligible.
 *
 * Both huddle-live (live feed poller) and huddle-data (schedule backfill
 * / client) share this module — so a key rotation self-heals once per
 * process, not twice.
 */
// Current public key. Same one every browser session uses. If it ever
// 401s, `scrapeApiKey()` below re-harvests from lolesports.com.
export const DEFAULT_API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const LOLESPORTS_SITE = 'https://lolesports.com';
const HARVEST_THROTTLE_MS = 3_600_000; // 1 hour
const KEY_RE = /"x-api-key"\s*:\s*"([a-zA-Z0-9]{32,})"/;
let activeKey = DEFAULT_API_KEY;
let lastHarvestAt = 0;
/** Current in-memory key. Starts at DEFAULT_API_KEY; updated by setApiKey. */
export function currentApiKey() {
    return activeKey;
}
/** Replace the in-memory key. Call after a successful scrapeApiKey. */
export function setApiKey(key) {
    activeKey = key;
}
/**
 * Re-scrape the public x-api-key from the lolesports.com main JS bundle.
 * Call automatically on 401/403. Safe to invoke multiple times — throttled
 * to once per hour via lastHarvestAt.
 *
 * Returns the newly harvested key (which the caller should then pass to
 * setApiKey if it differs from the current one), or the DEFAULT_API_KEY
 * if no match was found in the bundle — falling back to the hard-coded
 * constant is strictly better than a permanent outage.
 */
export async function scrapeApiKey(signal) {
    // Throttle: skip re-scrape if we already harvested recently AND we're
    // not still on the default (i.e. a previous harvest did change it).
    if (Date.now() - lastHarvestAt < HARVEST_THROTTLE_MS && activeKey !== DEFAULT_API_KEY) {
        return activeKey;
    }
    lastHarvestAt = Date.now();
    const res = await fetch(`${LOLESPORTS_SITE}/en-US`, {
        headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (compatible; huddle/1.0)' },
        signal,
    });
    if (!res.ok)
        throw new Error(`lolesports.com HTTP ${res.status} — cannot harvest key`);
    const html = await res.text();
    // Step 1: find the main JS bundle URL from the HTML.
    const scriptMatch = html.match(/<script[^>]*src="(\/_next\/static\/chunks\/main-[^"]+\.js)"/)
        ?? html.match(/"(\/_next\/static\/chunks\/main-[^"]+\.js)"/);
    const bundleUrl = scriptMatch ? `${LOLESPORTS_SITE}${scriptMatch[1]}` : null;
    // Step 2: grep the key out of the HTML + bundle bodies.
    const pagesToSearch = bundleUrl
        ? [html, await fetch(bundleUrl, { signal }).then((r) => r.text()).catch(() => '')]
        : [html];
    for (const body of pagesToSearch) {
        const m = body.match(KEY_RE);
        if (m && m[1])
            return m[1];
    }
    // Fallback: keep the hard-coded default so we don't go fully dark.
    return DEFAULT_API_KEY;
}
/** Test-only — reset in-process state so tests can drive scrape flow deterministically. */
export function _resetLolesportsApiKeyState() {
    activeKey = DEFAULT_API_KEY;
    lastHarvestAt = 0;
}
//# sourceMappingURL=lolesports-api.js.map