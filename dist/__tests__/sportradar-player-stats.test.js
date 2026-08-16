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
        // 1B/2B/3B/SB were missing here while five books priced all four markets — 5,872 live
        // odds rows the engine could not project (2026-08-16). TB rides along because the
        // provider states it and `total_bases` currently derives it as SLG x AB.
        ['mlb', ['H', 'HR', 'RBI', 'R', 'K', 'AB', '1B', '2B', '3B', 'TB', 'SB']],
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
/**
 * ENG-576 — an NHL goalie was written as fourteen skater zeros.
 *
 * Every one of 68,522 NHL rows in `player_game_stats` carried the same skater keys and
 * no `SV`, `GA`, `SA` or `TOI`. Connor Hellebuyck's rows read `SOG 0, G 0`, which is a
 * true statement about his shooting and says nothing about the game he played.
 *
 * The cause was one key up the tree: `goaltending` and `time_on_ice` are siblings of
 * `statistics` on the player object, and this took `statistics.total` alone. The values
 * below are verbatim from huddle-data's committed `nhl-game-summary.json` — Dustin
 * Tokarski, 21 saves on 24 shots, 57:43 — so this fails against any payload shape we
 * have not actually seen.
 */
describe('nhl goaltending and time on ice', () => {
    const TOKARSKI_TOTAL = {
        goals: 0, assists: 0, shots: 0, missed_shots: 0, blocked_shots: 0, hits: 0,
        takeaways: 0, giveaways: 0, plus_minus: 0, penalty_minutes: 0, penalties: 0,
        faceoffs_won: 0, faceoffs_lost: 0, faceoff_win_pct: 0,
    };
    const TOKARSKI_GROUPS = {
        goaltending: { total: { shots_against: 24, goals_against: 3, saves: 21, credit: 'loss', saves_pct: 0.875 } },
        timeOnIce: { shifts: 5, total: '57:43', avg: '11:32', evenstrength: '49:43' },
    };
    // A real skater from the same fixture: time on ice, no goaltending block.
    const DAHLIN_GROUPS = {
        timeOnIce: { shifts: 25, total: '21:23', avg: '00:51', evenstrength: '19:30' },
    };
    it('carries the save line the props market prices', () => {
        const flat = nhlPlayerStats(TOKARSKI_TOTAL, TOKARSKI_GROUPS);
        expect(flat.SV).toBe(21);
        expect(flat.SA).toBe(24);
        expect(flat.GA).toBe(3);
        expect(flat['SV%']).toBe(0.875);
    });
    it('carries time on ice for a skater, in the mm:ss the old feed used', () => {
        const flat = nhlPlayerStats({ ...TOKARSKI_TOTAL, goals: 1 }, DAHLIN_GROUPS);
        expect(flat.TOI).toBe('21:23');
        expect(flat.SHFT).toBe(25);
    });
    it('gives a skater no save keys at all', () => {
        // `SV: 0` on a skater would settle a saves prop at zero rather than decline to
        // settle it, which is worse than the key being absent.
        const flat = nhlPlayerStats(TOKARSKI_TOTAL, DAHLIN_GROUPS);
        expect(flat).not.toHaveProperty('SV');
        expect(flat).not.toHaveProperty('SA');
        expect(flat).not.toHaveProperty('GA');
    });
    it('leaves the skater line byte-identical when no groups are passed', () => {
        // The two existing callers pass nothing until they are updated, and neither may
        // change shape in the meantime — that would put two vocabularies in one table again.
        expect(nhlPlayerStats(TOKARSKI_TOTAL)).toEqual(nhlPlayerStats(TOKARSKI_TOTAL, {}));
        expect(Object.keys(nhlPlayerStats(TOKARSKI_TOTAL))).toHaveLength(14);
    });
    it('reaches the goalie through sportradarPlayerStats too', () => {
        const flat = sportradarPlayerStats('nhl', { total: TOKARSKI_TOTAL }, TOKARSKI_GROUPS);
        expect(flat.SV).toBe(21);
        expect(flat.TOI).toBe('57:43');
    });
    it('still returns null for a player who never appeared, groups or not', () => {
        expect(sportradarPlayerStats('nhl', {}, TOKARSKI_GROUPS)).toBeNull();
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