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
    it('is the major four plus cs2, and nothing else', () => {
        // Scope set 2026-08-01. If this list changes, every service's polling, projection
        // and assertion set changes with it — that is the point of the registry.
        expect(leaguesFor('odds').sort()).toEqual(['cs2', 'mlb', 'nba', 'nfl', 'nhl']);
        expect(leaguesFor('live').sort()).toEqual(['cs2', 'mlb', 'nba', 'nfl', 'nhl']);
    });
    it('excludes descoped leagues from every capability', () => {
        for (const sport of ['lol', 'valorant', 'dota2', 'cod', 'rl', 'r6']) {
            expect(isActive(sport), `${sport} should be inactive`).toBe(false);
            for (const c of CAPABILITIES)
                expect(leaguesFor(c)).not.toContain(sport);
        }
    });
    it('keeps descoped leagues in the union rather than deleting them', () => {
        // Years of their rows are in the database and code still reads them. Dropping the
        // slug would orphan that data; `active: false` is the switch that matters.
        for (const sport of ['lol', 'valorant', 'dota2', 'cod', 'rl', 'r6']) {
            expect(LEAGUE_REGISTRY[sport]).toBeDefined();
            expect(LEAGUE_REGISTRY[sport].note).toMatch(/[Dd]escoped/);
        }
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
    it('rejects a descoped league and says so', () => {
        expect(() => assertRegistered('rl', 'odds')).toThrow(/not active/);
        expect(() => assertRegistered('valorant', 'odds')).toThrow(/not active/);
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
        // Under the 2026-08-01 scope the descoped esports are unsupported too, not just rl.
        expect(result.unsupported.sort()).toEqual(['cod', 'dota2', 'lol', 'rl', 'valorant']);
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