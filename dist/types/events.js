/**
 * Runtime counterpart to `EventStatus`, for validation at provider and API
 * boundaries — a zod enum, a `Set` membership check, an `assertKnownVariant`
 * allowlist. Kept in one place so the writers and the readers cannot drift.
 */
export const EVENT_STATUSES = [
    'scheduled',
    'live',
    'final',
    'postponed',
    'cancelled',
    'suspended',
    'delayed',
];
/** Narrows an arbitrary string to `EventStatus`. */
export function isEventStatus(value) {
    return EVENT_STATUSES.includes(value);
}
/**
 * The statuses a fixture holds while it is on the board and still to be resolved — what a
 * query means by "the games we care about right now".
 *
 * It exists because that set was written out **ten times** across huddle-engine and
 * huddle-live as the literal `['scheduled', 'live']`, and every one of them was silently
 * wrong the moment `delayed` was added (ENG-614). A rain-delayed MLB game used to arrive
 * spelled `live` and was included everywhere by accident; once it spelled itself, it fell
 * out of the watcher's active set, out of `getUpcomingEvents`, out of `getCanonicalGames`
 * and out of both league-detection queries at once. Nothing errored. The watcher reads
 * "tracked, but absent from the snapshot" as finished.
 *
 * **`suspended` is deliberately NOT here, and that is a gap rather than a decision.** It was
 * outside the ten literals before this constant existed, so including it now would be a
 * behaviour change wearing a refactor's clothes — the thing this file's own history keeps
 * paying for. It belongs here on the plain reading of the taxonomy: a suspended game started,
 * stopped, and may resume. Adding it needs someone to measure what wakes up, not a tidy-up.
 *
 * `postponed` is correctly absent: it will not be played at its scheduled time, so its
 * `start_time` is stale and every one of these queries is keyed on `start_time`.
 */
export const ACTIVE_EVENT_STATUSES = [
    'scheduled',
    'live',
    'delayed',
];
/** True while a fixture is on the board and still to be resolved. See `ACTIVE_EVENT_STATUSES`. */
export function isActiveEventStatus(value) {
    return ACTIVE_EVENT_STATUSES.includes(value);
}
//# sourceMappingURL=events.js.map