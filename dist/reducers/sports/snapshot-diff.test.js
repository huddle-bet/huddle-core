import { describe, it, expect } from 'vitest';
import { snapshotDiff } from './common.js';
const ctx = {
    eventId: 'nba-1',
    leagueId: 'nba',
    sourceId: 'espn',
    sortIndex: 1000,
    occurredAt: '2026-04-13T20:00:00.000Z',
};
function snap(over = {}) {
    return {
        status: 'live',
        homeScore: 0,
        awayScore: 0,
        period: '1',
        clock: '12:00',
        possession: null,
        ...over,
    };
}
describe('snapshotDiff', () => {
    it('first poll (no prev) emits baseline status + clock + score', () => {
        const events = snapshotDiff(ctx, undefined, snap());
        const kinds = events.map((e) => e.kind);
        expect(kinds).toContain('status');
        expect(kinds).toContain('clock');
        expect(kinds).toContain('score');
    });
    it('no-change poll emits only clock (live heartbeat)', () => {
        const prev = snap({ homeScore: 42, awayScore: 39 });
        const events = snapshotDiff(ctx, prev, prev);
        expect(events).toHaveLength(1);
        expect(events[0].kind).toBe('clock');
    });
    it('status transition emits status event', () => {
        const prev = snap({ status: 'scheduled' });
        const curr = snap({ status: 'live' });
        const events = snapshotDiff(ctx, prev, curr);
        const statusEvt = events.find((e) => e.kind === 'status');
        expect(statusEvt).toBeTruthy();
        expect(statusEvt.status).toBe('live');
    });
    it('score change emits score event with delta + scorer', () => {
        const prev = snap({ homeScore: 10, awayScore: 8 });
        const curr = snap({ homeScore: 13, awayScore: 8 });
        const events = snapshotDiff(ctx, prev, curr);
        const scoreEvt = events.find((e) => e.kind === 'score');
        expect(scoreEvt).toBeTruthy();
        expect(scoreEvt.homeScore).toBe(13);
        expect(scoreEvt.scorer).toBe('home');
        expect(scoreEvt.delta).toBe(3);
    });
    it('period change emits end-of-period event for the outgoing period', () => {
        const prev = snap({ period: '1' });
        const curr = snap({ period: '2' });
        const events = snapshotDiff(ctx, prev, curr);
        const periodEvt = events.find((e) => e.kind === 'period');
        expect(periodEvt).toBeTruthy();
        expect(periodEvt.period).toBe('1');
        expect(periodEvt.phase).toBe('end');
    });
    it('possession flip emits possession event', () => {
        const prev = snap({ possession: 'home' });
        const curr = snap({ possession: 'away' });
        const events = snapshotDiff(ctx, prev, curr);
        const posEvt = events.find((e) => e.kind === 'possession');
        expect(posEvt).toBeTruthy();
        expect(posEvt.team).toBe('away');
    });
    it('final status suppresses the live clock event', () => {
        const prev = snap({ status: 'live' });
        const curr = snap({ status: 'final' });
        const events = snapshotDiff(ctx, prev, curr);
        expect(events.some((e) => e.kind === 'clock')).toBe(false);
        expect(events.some((e) => e.kind === 'status')).toBe(true);
    });
    it('multiple simultaneous changes all emit', () => {
        const prev = snap({ status: 'scheduled', homeScore: 0, awayScore: 0, period: '' });
        const curr = snap({ status: 'live', homeScore: 2, awayScore: 0, period: '1' });
        const events = snapshotDiff(ctx, prev, curr);
        const kinds = events.map((e) => e.kind).sort();
        expect(kinds).toEqual(['clock', 'score', 'status']);
    });
});
//# sourceMappingURL=snapshot-diff.test.js.map