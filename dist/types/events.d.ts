/**
 * Unified status taxonomy for the `events` table.
 *
 * Every service that writes or reads `events.status` MUST use this type.
 * As of ENG-520 none do — huddle-data redeclares its own narrower copy,
 * huddle-live writes a bare `string`, huddle-api validates against its own
 * zod enum. Wiring them onto this type is ENG-521 (ingest) and ENG-522 (API);
 * until then the "MUST" above is an intention, not a guarantee.
 *
 * Historical values `'ended'`, `'completed'`, and `'filled'` are removed —
 * a one-shot migration collapses them into `'final'`. Verified 2026-08-03:
 * `events` holds only `final` / `scheduled` / `live`, so the migration did
 * land, and no row has ever carried `cancelled`.
 *
 * The three disrupted states are distinct and not interchangeable:
 *
 * - `postponed` — will not be played at its scheduled time; a new start
 *   time may or may not be known. The fixture is still expected to happen.
 * - `cancelled` — will never be played. Spelled with two Ls; the mobile
 *   client's union was renamed to match the wire value (ENG-517).
 * - `suspended` — started and stopped mid-play, may resume. Distinct from
 *   `postponed`, which never started.
 *
 * `events.status` is a plain `TEXT` column with no check constraint, so
 * nothing at the database layer rejects a value outside this union. Use
 * `isEventStatus` at any boundary where a provider string becomes a status.
 */
export type EventStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled' | 'suspended';
/**
 * Runtime counterpart to `EventStatus`, for validation at provider and API
 * boundaries — a zod enum, a `Set` membership check, an `assertKnownVariant`
 * allowlist. Kept in one place so the writers and the readers cannot drift.
 */
export declare const EVENT_STATUSES: readonly ["scheduled", "live", "final", "postponed", "cancelled", "suspended"];
/** Narrows an arbitrary string to `EventStatus`. */
export declare function isEventStatus(value: string): value is EventStatus;
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
//# sourceMappingURL=events.d.ts.map