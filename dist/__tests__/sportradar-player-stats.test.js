import { describe, it, expect } from 'vitest';
import { isSummaryStatsSport, mlbPlayerStats, nbaPlayerStats, nhlPlayerStats, sportradarPlayerStats, } from '../sportradar/player-stats.js';
import { SUMMARY_PLAYER_STATS } from '../sportradar/__fixtures__/summary-player-stats.js';
const golden = SUMMARY_PLAYER_STATS;
describe.each(['nba', 'nhl', 'mlb'])('%s matches huddle-data byte for byte', (sport) => {
    const pairs = golden[sport];
    it('has fixtures to check', () => {
        // A renamed fixture key would otherwise make this suite vacuously pass.
        expect(pairs?.length ?? 0).toBeGreaterThan(0);
    });
    it.each(pairs.map((p) => [p.player, p]))('%s', (_name, pair) => {
        expect(sportradarPlayerStats(sport, pair.statistics)).toEqual(pair.expected);
    });
});
describe('the vocabulary is the one projections.ts reads', () => {
    // Guards against a port that is self-consistent but renames a key. These are the exact
    // lookups in huddle-engine's PROP_STATS_BY_LEAGUE.
    it.each([
        ['nba', ['PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', '3PT', 'MIN']],
        ['nhl', ['G', 'A', 'SOG', 'BS', 'HT', 'FW', '+/-']],
        ['mlb', ['H', 'HR', 'RBI', 'R', 'K', 'AB']],
    ])('%s exposes the keys the engine looks up', (sport, keys) => {
        const first = golden[sport][0];
        const flat = sportradarPlayerStats(sport, first.statistics);
        for (const k of keys)
            expect(Object.keys(flat), `${sport} is missing ${k}`).toContain(k);
    });
});
describe('absent stats stay absent', () => {
    it('returns null rather than a row of zeros when there is nothing to flatten', () => {
        // Writing zeros for a player who never appeared is its own wrong data — it would
        // pass a null-rate assertion while being false.
        expect(sportradarPlayerStats('nba', null)).toBeNull();
        expect(sportradarPlayerStats('nba', undefined)).toBeNull();
        expect(sportradarPlayerStats('nhl', {})).toBeNull();
        expect(sportradarPlayerStats('mlb', {})).toBeNull();
    });
    it('flattens a batter who did not pitch without inventing pitching keys', () => {
        const batterOnly = golden.mlb.find((p) => {
            const s = p.statistics;
            return s?.hitting?.overall && !s?.pitching?.overall;
        });
        expect(batterOnly, 'fixture set has no batter-only player').toBeDefined();
        const flat = sportradarPlayerStats('mlb', batterOnly.statistics);
        expect(flat).not.toHaveProperty('ERA');
        expect(flat).not.toHaveProperty('IP');
    });
});
describe('two-way players keep their batting line', () => {
    it('does not let pitching keys clobber batting on a key collision', () => {
        // H, R, BB, K and HR exist in both lines. Batting must win — that is what
        // huddle-data does, and a silent flip would change every two-way player's row.
        const stats = {
            hitting: { overall: { ab: 4, onbase: { h: 3, hr: 1, bb: 0 }, runs: { total: 2 }, outs: { ktotal: 1 } } },
            pitching: { overall: { ip_2: 6.1, onbase: { h: 9, hr: 4, bb: 5 }, runs: { total: 8, earned: 7 }, outs: { ktotal: 11 }, era: 4.5 } },
        };
        const flat = mlbPlayerStats(stats);
        expect(flat.H).toBe(3);
        expect(flat.HR).toBe(1);
        expect(flat.K).toBe(1);
        expect(flat.R).toBe(2);
        // Pitching-only keys still come through.
        expect(flat.IP).toBe(6.1);
        expect(flat.ER).toBe(7);
    });
});
describe('made-attempted pairs', () => {
    it('renders as "made-att", including when the source omits them', () => {
        const flat = nbaPlayerStats({});
        expect(flat.FG).toBe('0-0');
        expect(flat['3PT']).toBe('0-0');
        expect(flat.FT).toBe('0-0');
    });
});
describe('missing values become zero, not undefined', () => {
    it('nhl fills every tracked key', () => {
        const flat = nhlPlayerStats({});
        for (const v of Object.values(flat))
            expect(v).not.toBeUndefined();
        expect(flat.G).toBe(0);
    });
});
describe('isSummaryStatsSport', () => {
    it('accepts the three sports with a summary feed', () => {
        expect(['nba', 'nhl', 'mlb'].every(isSummaryStatsSport)).toBe(true);
    });
    it('rejects nfl, which has no summary feed at all', () => {
        // summary.json returns 404 for NFL; its box scores come from statistics.json and are
        // organised by category at team level. It cannot share this interface (ENG-463).
        expect(isSummaryStatsSport('nfl')).toBe(false);
    });
});
//# sourceMappingURL=sportradar-player-stats.test.js.map