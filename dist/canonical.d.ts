import type { CanonicalEventKey } from './types/events.js';
/**
 * Compute the `canonical_event_id` that joins rows across data sources.
 *
 * Every source (GSK, bo3.gg, dltv, bp.gg, ESPN) writes its own row into
 * the `events` table keyed by `(id, source_id)`. Rows that describe the
 * same real-world match share this canonical ID, which is the join key
 * for stitching live state (GSK-sourced) to final stats (scraper-sourced).
 *
 * Format: `${sport}:event:${YYYY-MM-DD}:${teamA}:${teamB}` where the two
 * team IDs are sorted alphabetically and the date is normalized to US
 * Eastern timezone.
 *
 * CRITICAL: callers must pass canonical team IDs resolved via huddle-core's
 * TeamRegistry. Do NOT fall back to slugified team names — the previous
 * behavior in huddle-live's writer silently produced drift-prone IDs when
 * a team lookup failed. Fail loudly instead so the team registry can be
 * fixed.
 */
export declare function canonicalEventId(key: CanonicalEventKey): string;
/** Convert an ISO timestamp to a YYYY-MM-DD date string in US Eastern time. */
export declare function toEasternDate(isoTime: string): string;
/**
 * Supabase Realtime channel name for a live fixture. Both huddle-live
 * (publisher) and huddle-api (subscriber) MUST use this helper so the
 * channel format never drifts between services.
 */
export declare function liveChannelName(fixtureId: string): string;
//# sourceMappingURL=canonical.d.ts.map