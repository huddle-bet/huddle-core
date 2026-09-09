import { describe, expect, it } from 'vitest';
import { ACTIVE_EVENT_STATUSES, EVENT_STATUSES, isActiveEventStatus, isEventStatus } from '../events.js';
import { isTerminalStatus } from '../../sportradar/game-status.js';
/**
 * `ACTIVE_EVENT_STATUSES` replaces ten copies of the literal `['scheduled', 'live']` across
 * huddle-engine and huddle-live. Every one of them went silently wrong when `delayed` was
 * added (ENG-614): a rain-delayed game used to arrive spelled `live` and was included by
 * accident, and once it spelled itself it fell out of the watcher's active set, out of both
 * of the engine's upcoming-fixture reads and out of both of its league-detection queries.
 *
 * Nothing errored, which is the point — and the watcher reads "tracked, but absent from the
 * snapshot" as finished.
 */
describe('ACTIVE_EVENT_STATUSES', () => {
    it('holds only real statuses', () => {
        for (const s of ACTIVE_EVENT_STATUSES) {
            expect(isEventStatus(s), s).toBe(true);
        }
    });
    it('holds nothing terminal', () => {
        // A query filtering on this set means "still to be resolved". A terminal member would
        // put finished and cancelled games into the engine's upcoming reads.
        for (const s of ACTIVE_EVENT_STATUSES) {
            expect(isTerminalStatus(s), s).toBe(false);
        }
    });
    it('holds delayed, which is the regression it exists for', () => {
        expect(isActiveEventStatus('delayed')).toBe(true);
    });
    /**
     * The two exclusions, pinned so removing either is a decision rather than a tidy-up.
     *
     * `postponed` is correct: it will not be played at its scheduled time, and every query
     * using this set is keyed on `start_time`.
     *
     * `suspended` is a gap and the doc on the constant says so. It sat outside all ten literals
     * before the constant existed, so adding it here would be a behaviour change wearing a
     * refactor's clothes. It needs someone to measure what wakes up.
     */
    it('excludes postponed and suspended', () => {
        expect(isActiveEventStatus('postponed')).toBe(false);
        expect(isActiveEventStatus('suspended')).toBe(false);
    });
    it('is a strict subset of the taxonomy, and smaller than it', () => {
        // Guards the empty and the everything cases at once: a set that had stopped being built
        // would pass every assertion above by matching nothing.
        expect(ACTIVE_EVENT_STATUSES.length).toBeGreaterThan(0);
        expect(ACTIVE_EVENT_STATUSES.length).toBeLessThan(EVENT_STATUSES.length);
    });
    it('rejects a string that is not a status at all', () => {
        expect(isActiveEventStatus('inprogress')).toBe(false);
    });
});
//# sourceMappingURL=active-statuses.test.js.map