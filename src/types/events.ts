/**
 * Unified status taxonomy for the `events` table.
 *
 * Every service that writes or reads `events.status` MUST use this type.
 * Historical values `'ended'`, `'completed'`, and `'filled'` are removed —
 * a one-shot migration collapses them into `'final'`.
 */
export type EventStatus = 'scheduled' | 'live' | 'final' | 'cancelled';

/**
 * Inputs to `canonicalEventId()`. Surfaces the requirement that callers
 * must resolve canonical team IDs before computing the key — no fallbacks
 * to slugified team names.
 */
export interface CanonicalEventKey {
  /** Sport slug — must match the `league_id` column in the events table. */
  sport: string;
  /** ISO 8601 start time of the match. Normalized to US Eastern date internally. */
  startTime: string;
  /** Canonical team ID for team A (resolved via huddle-core TeamRegistry). */
  teamIdA: string;
  /** Canonical team ID for team B (resolved via huddle-core TeamRegistry). */
  teamIdB: string;
}
