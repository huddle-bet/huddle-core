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
export declare const DEFAULT_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
/** Current in-memory key. Starts at DEFAULT_API_KEY; updated by setApiKey. */
export declare function currentApiKey(): string;
/** Replace the in-memory key. Call after a successful scrapeApiKey. */
export declare function setApiKey(key: string): void;
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
export declare function scrapeApiKey(signal?: AbortSignal): Promise<string>;
/** Test-only — reset in-process state so tests can drive scrape flow deterministically. */
export declare function _resetLolesportsApiKeyState(): void;
//# sourceMappingURL=lolesports-api.d.ts.map