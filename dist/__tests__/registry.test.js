import { describe, it, expect } from 'vitest';
import { SPORTS } from '../types/sports.js';
import { CAPABILITIES, LEAGUE_REGISTRY, assertRegistered, isActive, leaguesFor, reconcile, supports, } from '../config/registry.js';
describe('registry covers every sport', () => {
    it('has an entry for each sport in SPORTS, and no extras', () => {
        expect(Object.keys(LEAGUE_REGISTRY).sort()).toEqual(Object.keys(SPORTS).sort());
    });
    it('declares only known capabilities', () => {
        for (const [sport, entry] of Object.entries(LEAGUE_REGISTRY)) {
            for (const c of entry.capabilities) {
                expect(CAPABILITIES, `${sport} declares an unknown capability`).toContain(c);
            }
        }
    });
});
describe('leaguesFor', () => {
    it('returns active leagues for the capability', () => {
        const odds = leaguesFor('odds');
        expect(odds).toContain('nfl');
        expect(odds).toContain('mlb');
        expect(odds).toContain('cs2');
    });
    it('excludes leagues no book carries', () => {
        // rl is active and live, but every book id for it is empty — polling it for odds
        // could only ever be a no-op, which is what the deployed command did.
        expect(leaguesFor('live')).toContain('rl');
        expect(leaguesFor('odds')).not.toContain('rl');
    });
    it('excludes dormant leagues entirely', () => {
        expect(isActive('r6')).toBe(false);
        for (const c of CAPABILITIES)
            expect(leaguesFor(c)).not.toContain('r6');
    });
    it('never returns a league it does not also report as supported', () => {
        for (const c of CAPABILITIES) {
            for (const s of leaguesFor(c))
                expect(supports(s, c)).toBe(true);
        }
    });
});
describe('assertRegistered', () => {
    it('rejects a league that has never existed', () => {
        // The actual value that sat in the deployed poll command since 2026-03-27.
        expect(() => assertRegistered('ncaam', 'odds')).toThrow(/Unknown league "ncaam"/);
    });
    it('rejects an active league that cannot serve the capability, and says what it can', () => {
        expect(() => assertRegistered('rl', 'odds')).toThrow(/not registered for "odds"/);
        expect(() => assertRegistered('rl', 'odds')).toThrow(/provides: schedule, live/);
    });
    it('rejects a dormant league', () => {
        expect(() => assertRegistered('r6', 'schedule')).toThrow(/not active/);
    });
    it('accepts and narrows a registered league', () => {
        const sport = assertRegistered('nfl', 'odds');
        expect(sport).toBe('nfl');
    });
});
describe('reconcile', () => {
    it('reports every way the deployed poll list was wrong', () => {
        const deployed = ['nba', 'nhl', 'mlb', 'ncaam', 'cs2', 'lol', 'valorant', 'dota2', 'cod', 'rl'];
        const result = reconcile(deployed, 'odds');
        expect(result.unknown).toEqual(['ncaam']);
        expect(result.unsupported).toEqual(['rl']);
        expect(result.missing).toEqual(['nfl']);
    });
    it('reports nothing wrong when the request is the registry', () => {
        const result = reconcile(leaguesFor('odds'), 'odds');
        expect(result).toMatchObject({ unknown: [], unsupported: [], missing: [] });
        expect(result.resolved).toEqual(leaguesFor('odds'));
    });
    it('flags an active league dropped from the request — the case this exists for', () => {
        const withoutNfl = leaguesFor('odds').filter((s) => s !== 'nfl');
        expect(reconcile(withoutNfl, 'odds').missing).toEqual(['nfl']);
    });
});
//# sourceMappingURL=registry.test.js.map