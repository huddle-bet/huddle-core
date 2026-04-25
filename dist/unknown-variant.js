/**
 * Unknown-variant guard — makes upstream enum drift *loud* instead of silent.
 *
 * Every translator that maps an upstream enum value (dragon type,
 * series_type, event name, status string, …) to our canonical shape has
 * a "known" allowlist. When upstream adds a new variant mid-season (e.g.
 * Riot shipping Atakhan as a new dragon-era objective, Valve shipping a
 * Bo7 series_type, HLTV scorebot emitting a new event name), the naive
 * fallback of "return null / default to 1 / drop it" loses data and —
 * worse — fails silently, so the data team only finds out weeks later
 * when someone asks where the numbers went.
 *
 * `assertKnownVariant` returns a boolean (true = known, false = unknown)
 * so callers stay in control of their fallback behavior, and *also*
 * emits a single structured warn log the first time each distinct
 * (category, value) tuple is seen. Subsequent hits in the same process
 * are deduped so a hot loop can't flood stderr.
 *
 * Design goals:
 *  - Zero runtime dependencies (huddle-core rule).
 *  - Callers keep their fallback in plain code — this helper only adds
 *    observability, it does not change control flow.
 *  - Dedup is per-process — intentional. A restart re-logs every variant
 *    once, which is exactly what you want after deploying a fix.
 *
 * Example:
 *   const known = assertKnownVariant('lol.dragon_type', type, KNOWN_DRAGONS);
 *   return known ? DRAGON_DISPLAY[type] : type; // preserve raw on unknown
 */
const DEFAULT_LOGGER = (msg) => console.warn(msg);
/**
 * Process-wide dedup cache. Keyed by `${category}::${String(value)}`.
 * Unbounded by design — distinct unknown values should be rare
 * (finite upstream schema). If this ever grows without bound the
 * upstream has drifted catastrophically and the log flood is the
 * smallest of our problems.
 */
const seen = new Set();
/**
 * Returns true if `value` is in the `known` allowlist. If unknown, emits
 * a structured warn log *once per process* for this (category, value)
 * pair and returns false.
 *
 * Callers decide the fallback (default value, preserve raw, drop, etc.).
 */
export function assertKnownVariant(category, value, known, opts) {
    const set = known instanceof Set ? known : new Set(known);
    if (set.has(value))
        return true;
    const key = `${category}::${String(value)}`;
    if (seen.has(key))
        return false;
    seen.add(key);
    const log = opts?.log ?? DEFAULT_LOGGER;
    const ctx = opts?.context ? ` context=${JSON.stringify(opts.context)}` : '';
    const knownStr = [...set].map(String).sort().join(',');
    log(`[unknown-variant] category=${category} value=${JSON.stringify(value)} known=[${knownStr}]${ctx}`);
    return false;
}
/**
 * Test-only — clears the dedup cache so tests can assert the helper
 * logs exactly once per distinct unknown variant without cross-test
 * contamination. Do not call from production code.
 */
export function _resetAssertKnownVariantCache() {
    seen.clear();
}
//# sourceMappingURL=unknown-variant.js.map