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
export function canonicalEventId(key: CanonicalEventKey): string {
  if (!key.teamIdA || !key.teamIdB) {
    throw new Error(
      `canonicalEventId requires both team IDs — got teamIdA=${key.teamIdA!}, teamIdB=${key.teamIdB!}`,
    );
  }
  const dateStr = toEasternDate(key.startTime);
  const [a, b] = [key.teamIdA, key.teamIdB].sort();
  return `${key.sport}:event:${dateStr}:${a}:${b}`;
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
