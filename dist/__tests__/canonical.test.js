import { describe, it, expect } from 'vitest';
import { canonicalEventId, toEasternDate, liveChannelName } from '../canonical.js';
describe('canonicalEventId', () => {
    const baseKey = {
        sport: 'nba',
        startTime: '2026-03-17T23:00:00Z',
        teamIdA: 'nba:team:hornets',
        teamIdB: 'nba:team:heat',
    };
    it('produces the documented format', () => {
        // sport:event:YYYY-MM-DD:teamA:teamB
        expect(canonicalEventId(baseKey)).toBe('nba:event:2026-03-17:nba:team:heat:nba:team:hornets');
    });
    it('is deterministic across calls', () => {
        expect(canonicalEventId(baseKey)).toBe(canonicalEventId(baseKey));
    });
    it('sorts team ids so caller order does not matter', () => {
        const swapped = { ...baseKey, teamIdA: baseKey.teamIdB, teamIdB: baseKey.teamIdA };
        expect(canonicalEventId(baseKey)).toBe(canonicalEventId(swapped));
    });
    it('places the alphabetically-lower team id first', () => {
        const id = canonicalEventId(baseKey);
        expect(id).toContain(':nba:team:heat:nba:team:hornets');
        expect(id).not.toContain(':nba:team:hornets:nba:team:heat');
    });
    it('uses US Eastern date, not UTC', () => {
        // 2026-03-17T03:00:00Z is 2026-03-16 23:00 EDT — should canonicalize
        // to the Eastern date (the 16th), not the UTC date (the 17th).
        const id = canonicalEventId({ ...baseKey, startTime: '2026-03-17T03:00:00Z' });
        expect(id).toContain(':2026-03-16:');
        expect(id).not.toContain(':2026-03-17:');
    });
    it('keeps Eastern date for late-night UTC during DST', () => {
        // 03:30 UTC on Mar 18 = 23:30 EDT on Mar 17 (post-DST transition).
        const id = canonicalEventId({ ...baseKey, startTime: '2026-03-18T03:30:00Z' });
        expect(id).toContain(':2026-03-17:');
    });
    it('keeps Eastern date for late-night UTC during EST', () => {
        // 03:30 UTC on Jan 5 = 22:30 EST on Jan 4 (winter, no DST).
        const id = canonicalEventId({ ...baseKey, startTime: '2026-01-05T03:30:00Z' });
        expect(id).toContain(':2026-01-04:');
    });
    it('throws when teamIdA is missing', () => {
        expect(() => canonicalEventId({ ...baseKey, teamIdA: '' })).toThrow(/requires both team IDs/);
    });
    it('throws when teamIdB is missing', () => {
        expect(() => canonicalEventId({ ...baseKey, teamIdB: '' })).toThrow(/requires both team IDs/);
    });
    it('throws on an unparseable ISO timestamp', () => {
        expect(() => canonicalEventId({ ...baseKey, startTime: 'not-a-date' })).toThrow(/invalid ISO timestamp/);
    });
    it('handles esports sports and arbitrary id shapes', () => {
        const id = canonicalEventId({
            sport: 'lol',
            startTime: '2026-04-15T11:00:00Z',
            teamIdA: 'lol:team:t1',
            teamIdB: 'lol:team:gen-g',
        });
        // 11:00 UTC = 07:00 EDT — same calendar day in both zones
        expect(id).toBe('lol:event:2026-04-15:lol:team:gen-g:lol:team:t1');
    });
    it('handles the same teams playing twice on the same Eastern day', () => {
        // Two start times five hours apart but the same Eastern date —
        // both produce the same canonical id. By design: same fixture
        // identity, regardless of how many sources schedule it differently.
        const morning = canonicalEventId({ ...baseKey, startTime: '2026-03-17T15:00:00Z' });
        const evening = canonicalEventId({ ...baseKey, startTime: '2026-03-17T23:00:00Z' });
        expect(morning).toBe(evening);
    });
});
describe('toEasternDate', () => {
    it('returns YYYY-MM-DD', () => {
        expect(toEasternDate('2026-03-17T23:00:00Z')).toBe('2026-03-17');
    });
    it('rolls the Eastern date back when UTC is past midnight but Eastern is not', () => {
        expect(toEasternDate('2026-03-17T03:00:00Z')).toBe('2026-03-16');
    });
    it('throws on invalid input', () => {
        expect(() => toEasternDate('garbage')).toThrow(/invalid ISO timestamp/);
    });
});
describe('liveChannelName', () => {
    it('prefixes with live:', () => {
        expect(liveChannelName('fx-123')).toBe('live:fx-123');
    });
});
//# sourceMappingURL=canonical.test.js.map