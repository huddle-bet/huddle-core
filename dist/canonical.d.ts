import type { CanonicalEventKey } from './types/events.js';
/**
 * Compute the `canonical_event_id` that joins rows across data sources.
 *
 * Each source writes its own row into the `events` table keyed by
 * `(id, source_id)`. Rows that describe the same real-world match share this
 * canonical ID, which is the join key for stitching live state
 * (provider-sourced) to final stats (scraper-sourced).
 *
 * Which source per league, measured 2026-08-03 — the list this comment used to
 * carry (HLTV, bo3.gg, dltv, bp.gg, ESPN) named five scrapers without saying
 * which league each served, and reads as though several compete per sport:
 *
 *   cs2       hltv 23,336            (bo3gg wrote 269 rows across one week in
 *                                     April and nothing since)
 *   nba/nfl   sportradar             (espn 91 and 7 rows, a legacy tail)
 *   nhl/mlb   sportradar
 *   dota2     valve, bo3gg, dltv     genuinely multi-source
 *   cod       breakingpoint, bp.gg
 *   lol       lolesports
 *   valorant  vlr.gg
 *   rl        blast
 *   r6        r6.ubisoft.com, siege.gg
 *
 * So every *launch* sport has one live source. The multi-source case is real
 * but lives in the frozen esports (ENG-403).
 *
 * Format: `${sport}:event:${YYYY-MM-DD}:${teamA}:${teamB}` where the two
 * team IDs are sorted alphabetically and the date is normalized to US
 * Eastern timezone.
 *
 * The date is part of the identity, so a game that moves across an Eastern
 * date boundary gets a *different* canonical ID. That is handled in the
 * database, not here: the `events_record_canonical_move` trigger repoints the
 * rows joined to the retired ID and records the mapping in
 * `canonical_event_aliases` (ENG-471). Callers recomputing this after a
 * postponement need do nothing special.
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