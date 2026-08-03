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
];
/** Narrows an arbitrary string to `EventStatus`. */
export function isEventStatus(value) {
    return EVENT_STATUSES.includes(value);
}
//# sourceMappingURL=events.js.map