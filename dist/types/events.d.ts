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
 * The four disrupted states are distinct and not interchangeable:
 *
 * - `postponed` — will not be played at its scheduled time; a new start
 *   time may or may not be known. The fixture is still expected to happen.
 * - `cancelled` — will never be played. Spelled with two Ls; the mobile
 *   client's union was renamed to match the wire value (ENG-517).
 * - `suspended` — started and stopped mid-play, may resume. Distinct from
 *   `postponed`, which never started.
 * - `delayed` — not being played right now and still expected today, whether
 *   or not it ever started. Deliberately covers both senses, because the
 *   provider does not separate them: see `mapSportradarStatus`, where
 *   `delayed`, `wdelay` and `fdelay` arrive for a late first pitch and for a
 *   mid-play stoppage alike, and the payload carries nothing to tell them
 *   apart. A member that is narrower than the evidence would need a
 *   distinction nobody can make.
 *
 * `delayed` was added 2026-09-09, and the evidence is the part that matters.
 * `game-status.ts` has said since it was written that mapping `delayed` is
 * unsettled — Sportradar uses it for both senses, and "choosing either without
 * observing a real delayed game would replace one bug with its mirror image".
 * A real one was finally observed: MLB Minnesota at Detroit on 2026-09-09 sat
 * at `status = 'live'` with **no `live_state` row** and a start time still in
 * the future, while Sportradar reported `wdelay` and MLB called it a weather
 * delay. The client had no value to draw but LIVE.
 *
 * The union member is what makes that mapping settleable, because it is
 * neither of the two wrong answers. It does **not** settle it here. Three
 * things must accept the value before `mapSportradarStatus` may return it:
 * this union, the mobile client's copy, and huddle-data's own narrower
 * redeclaration (ENG-520/521). Until then the member is inert, and the writer
 * that put `live` on an unstarted fixture is unchanged.
 *
 * `events.status` is a plain `TEXT` column with no check constraint, so
 * nothing at the database layer rejects a value outside this union. Use
 * `isEventStatus` at any boundary where a provider string becomes a status.
 */
export type EventStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled' | 'suspended' | 'delayed';
/**
 * Runtime counterpart to `EventStatus`, for validation at provider and API
 * boundaries — a zod enum, a `Set` membership check, an `assertKnownVariant`
 * allowlist. Kept in one place so the writers and the readers cannot drift.
 */
export declare const EVENT_STATUSES: readonly ["scheduled", "live", "final", "postponed", "cancelled", "suspended", "delayed"];
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
    /**
     * Which meeting of these two teams on this date — 1 (or omitted) for the only or first
     * game, 2 for the second, and so on.
     *
     * The identity is `(sport, Eastern date, sorted team pair)`, which cannot separate two
     * fixtures that share all three. Two real cases do:
     *
     *   - an **MLB doubleheader** — same teams, same date, same home team
     *   - an **NHL home-and-home** resolved on one date — same teams, home and away swapped,
     *     and the team ids are sorted so the swap is invisible
     *
     * Measured 2026-08-13: 30 canonical ids each covered two real fixtures (mlb 23 + 1,
     * nhl 1 + 5). Every colliding pair differs by start time, hours apart.
     *
     * **Omitting this reproduces the previous id exactly**, so no existing id moves and
     * nothing needs migrating. Only a second-or-later meeting gets a new form.
     *
     * The caller supplies it because deciding it needs knowledge of the *other* fixtures on
     * that date, and this function is pure by design — it takes no database. A writer that
     * has the day's schedule can order same-pair fixtures by start time and number them;
     * one that cannot should omit it and accept the collision rather than guess.
     */
    sequence?: number;
}
//# sourceMappingURL=events.d.ts.map