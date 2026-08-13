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
export function canonicalEventId(key: CanonicalEventKey): string {
  if (!key.teamIdA || !key.teamIdB) {
    throw new Error(
      `canonicalEventId requires both team IDs — got teamIdA=${key.teamIdA!}, teamIdB=${key.teamIdB!}`,
    );
  }
  const dateStr = toEasternDate(key.startTime);
  const [a, b] = [key.teamIdA, key.teamIdB].sort();
  const base = `${key.sport}:event:${dateStr}:${a}:${b}`;

  // A second meeting of the same pair on the same date gets a suffix; the first does not.
  //
  // Sorting the team ids discards home/away, and the date has one-day granularity, so
  // `(sport, date, pair)` cannot separate an MLB doubleheader or an NHL home-and-home
  // played on one date. Both exist: 30 ids covered two real fixtures each when measured
  // 2026-08-13.
  //
  // Suffixing only the second-and-later meeting is what makes this safe to land without a
  // migration — every id in the database today is a first meeting and keeps its exact
  // current value. `sequence` of 1 or undefined must therefore produce a byte-identical
  // string to the pre-change function, and the tests assert that rather than assuming it.
  //
  // Guarded rather than trusted: a non-integer or sub-1 sequence is a caller bug, and
  // silently coercing it would mint an id that looks right and joins to nothing.
  if (key.sequence === undefined || key.sequence === 1) return base;
  if (!Number.isInteger(key.sequence) || key.sequence < 1) {
    throw new Error(
      `canonicalEventId: sequence must be a positive integer — got ${String(key.sequence)}`,
    );
  }
  return `${base}:g${key.sequence}`;
}

/** Convert an ISO timestamp to a YYYY-MM-DD date string in US Eastern time. */
export function toEasternDate(isoTime: string): string {
  const d = new Date(isoTime);
  if (isNaN(d.getTime())) {
    throw new Error(`toEasternDate: invalid ISO timestamp: ${isoTime}`);
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Supabase Realtime channel name for a live fixture. Both huddle-live
 * (publisher) and huddle-api (subscriber) MUST use this helper so the
 * channel format never drifts between services.
 */
export function liveChannelName(fixtureId: string): string {
  return `live:${fixtureId}`;
}
