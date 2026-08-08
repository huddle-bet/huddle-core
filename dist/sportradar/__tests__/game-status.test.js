import { describe, expect, it, vi } from 'vitest';
import { SPORTRADAR_GAME_STATUSES, isTerminalStatus, mapSportradarStatus, } from '../game-status.js';
import { EVENT_STATUSES } from '../../types/events.js';
import { _resetAssertKnownVariantCache } from '../../unknown-variant.js';
/**
 * ENG-521. Three cancelled MLB fixtures sat in `events` as completed games — 0-0, no
 * play-by-play, nothing reporting a problem — because every copy of this mapping spelled
 * the wire value with two Ls and so never matched it.
 *
 * Wire values measured against the live API on 2026-08-08:
 *
 *     GET games/2026/03/15/schedule.json  ->  {"closed":16,"canceled":1}
 *     GET games/c522e6ef…/summary.json    ->  status=canceled
 */
describe('mapSportradarStatus', () => {
    it('maps canceled (one L, as Sportradar spells it) to cancelled', () => {
        expect(mapSportradarStatus('canceled')).toBe('cancelled');
    });
    it('maps postponed to postponed rather than silently to scheduled', () => {
        expect(mapSportradarStatus('postponed')).toBe('postponed');
    });
    it('maps played-out games to final', () => {
        expect(mapSportradarStatus('closed')).toBe('final');
        expect(mapSportradarStatus('complete')).toBe('final');
    });
    it('maps in-play statuses to live', () => {
        expect(mapSportradarStatus('inprogress')).toBe('live');
        expect(mapSportradarStatus('halftime')).toBe('live');
    });
    it('treats playoff placeholders as scheduled — unplayed, not cancelled', () => {
        expect(mapSportradarStatus('if_necessary')).toBe('scheduled');
        expect(mapSportradarStatus('unnecessary')).toBe('scheduled');
    });
    it('treats a missing status as scheduled without throwing', () => {
        expect(mapSportradarStatus(undefined)).toBe('scheduled');
        expect(mapSportradarStatus(null)).toBe('scheduled');
        expect(mapSportradarStatus('')).toBe('scheduled');
    });
    /**
     * The regression that started this. If someone "corrects" the wire spelling to the British
     * one, `canceled` stops matching and silently becomes `scheduled` again — this fails first.
     */
    it('never emits the American spelling as an EventStatus', () => {
        for (const s of SPORTRADAR_GAME_STATUSES) {
            expect(mapSportradarStatus(s)).not.toBe('canceled');
        }
    });
    it('maps every wire value to a real EventStatus', () => {
        const valid = new Set(EVENT_STATUSES);
        for (const s of SPORTRADAR_GAME_STATUSES) {
            expect(valid.has(mapSportradarStatus(s)), `${s} produced an unknown status`).toBe(true);
        }
    });
    /**
     * `delayed` is deliberately unresolved — Sportradar uses it both for a stoppage mid-play and
     * for a game that has not started. Pinned so a change is a decision, not a drift.
     */
    it('leaves delayed on live, pending a real observation', () => {
        expect(mapSportradarStatus('delayed')).toBe('live');
    });
    /**
     * MLB's weather and field delays. They never appear in a schedule payload — a scan of 5,308
     * games returned only closed, scheduled, inprogress, postponed and unnecessary — so these
     * are known from huddle-live's MLB translators, which have carried them since they were
     * written. Mapping them anywhere but `live` would regress a delayed game to `scheduled`.
     */
    it('keeps MLB weather and field delays on live, as the live translators always did', () => {
        expect(mapSportradarStatus('wdelay')).toBe('live');
        expect(mapSportradarStatus('fdelay')).toBe('live');
    });
    it('maps a suspended game to suspended, not final', () => {
        expect(mapSportradarStatus('suspended')).toBe('suspended');
    });
    describe('unknown values', () => {
        it('falls back to scheduled rather than throwing', () => {
            // A status shipped mid-season must not take a whole schedule poll down over one fixture.
            expect(mapSportradarStatus('some_new_status_2027')).toBe('scheduled');
        });
        it('warns, so it does not pass silently the way canceled did', () => {
            _resetAssertKnownVariantCache();
            const log = vi.fn();
            mapSportradarStatus('rain_shortened', { log, context: { sport: 'mlb' } });
            expect(log).toHaveBeenCalledTimes(1);
            expect(log.mock.calls[0][0]).toContain('rain_shortened');
            expect(log.mock.calls[0][0]).toContain('sportradar.game_status');
        });
        it('does not warn for a value it understands', () => {
            _resetAssertKnownVariantCache();
            const log = vi.fn();
            mapSportradarStatus('canceled', { log });
            expect(log).not.toHaveBeenCalled();
        });
    });
});
describe('isTerminalStatus', () => {
    /**
     * Live adapters previously tested `FINAL_STATUSES.has(s)` to decide when to stop polling,
     * which conflated "finished" with "final" — so a cancelled game could never be released and
     * sat in the active set until a stale sweep marked it `final`.
     */
    it('treats a cancelled game as over, not just a final one', () => {
        expect(isTerminalStatus('final')).toBe(true);
        expect(isTerminalStatus('cancelled')).toBe(true);
    });
    it('does not treat a resumable or upcoming state as over', () => {
        expect(isTerminalStatus('live')).toBe(false);
        expect(isTerminalStatus('scheduled')).toBe(false);
        expect(isTerminalStatus('suspended')).toBe(false);
        // Postponed will be played, at a time we may not know yet.
        expect(isTerminalStatus('postponed')).toBe(false);
    });
    it('classifies every EventStatus, so a new one cannot be forgotten', () => {
        for (const s of EVENT_STATUSES) {
            expect(typeof isTerminalStatus(s)).toBe('boolean');
        }
    });
});
describe('the wire union', () => {
    it('carries the American spelling and not the British one', () => {
        const all = SPORTRADAR_GAME_STATUSES;
        expect(all).toContain('canceled');
        expect(all).not.toContain('cancelled');
    });
    it('is exhaustive against the type', () => {
        const fromType = [
            'scheduled', 'created', 'inprogress', 'halftime', 'delayed',
            'wdelay', 'fdelay', 'suspended',
            'complete', 'closed', 'canceled', 'postponed', 'if_necessary', 'unnecessary',
        ];
        expect([...SPORTRADAR_GAME_STATUSES].sort()).toEqual(fromType.sort());
    });
});
//# sourceMappingURL=game-status.test.js.map