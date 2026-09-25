/**
 * Team-level per-game stat extraction — ENG-407.
 *
 * Fixtures are trimmed REAL Sportradar payload blocks (fetched 2026-08-12):
 * NFL statistics.home from the 08-07 Cardinals–Panthers preseason final,
 * NBA/NHL summary home teams from each league's last final, MLB game.home
 * from the 08-12 Twins–Orioles final. Committed rather than fetched so this
 * runs in CI without a key; values asserted are the payloads' own numbers.
 *
 * `nhl_shootout` was added 2026-08-23: both teams from `66a45031` (COL @ EDM,
 * 2026-04-14), trimmed of `players` and `statistics.periods`. The original `nhl`
 * block was trimmed down to `statistics` alone, which is why it could not have
 * caught this — a fixture holding only what the function already read cannot fail
 * when the function reads too little.
 *
 * The contract: each sport's extractor flattens its real shape into the flat
 * record team_game_stats.stats stores, keeps the provider's vocabulary, and
 * never emits objects or arrays as values.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { nflTeamStats, nbaTeamStats, nhlTeamStats, mlbTeamStats, } from '../team-stats.js';
const fx = JSON.parse(readFileSync(new URL('../__fixtures__/team-game-stats.json', import.meta.url), 'utf8'));
const allScalar = (stats) => Object.values(stats).every((v) => typeof v === 'string' || typeof v === 'number');
describe('per-sport team game stat extraction (ENG-407)', () => {
    it('NFL: summary, category totals, first downs, and nested efficiency', () => {
        const s = nflTeamStats(fx.nfl);
        expect(s.total_yards).toBe(425);
        expect(s.possession_time).toBe('34:21');
        expect(s.rushing_attempts).toBe(34);
        expect(s.first_downs_total).toBe(23);
        expect(s.touchdowns_pass).toBe(2);
        expect(s.efficiency_redzone_pct).toBe(50.0);
        expect(allScalar(s)).toBe(true);
        // identity fields must not leak into stats
        expect(s.id).toBeUndefined();
        expect(s.name).toBeUndefined();
    });
    it('NBA: the flat statistics block, as-is', () => {
        const s = nbaTeamStats(fx.nba.statistics);
        expect(s.field_goals_made).toBe(33);
        expect(Object.keys(s).length).toBeGreaterThan(50);
        expect(allScalar(s)).toBe(true);
    });
    it('NHL: total keeps bare keys, strength states prefix', () => {
        const s = nhlTeamStats(fx.nhl);
        expect(s.goals).toBe(0);
        expect(s.powerplay_shots).toBe(7);
        expect(allScalar(s)).toBe(true);
    });
    /**
     * 392 of 5,859 stored NHL finals (6.69%) read as ties, in a league that has not had one
     * since 2005-06. `team.points` is the score of record and sits BESIDE `statistics`, which
     * is all this function was given.
     *
     * COL @ EDM finished 2-1 on a shootout. In the payload: `away.points 2`, `home.points 1`,
     * `total.goals 1` on both sides, `away.shootout.goals 3` and `home.shootout.goals 2`.
     */
    it('NHL: a shootout win is not a tie', () => {
        const home = nhlTeamStats(fx.nhl_shootout.home);
        const away = nhlTeamStats(fx.nhl_shootout.away);
        // The defect, stated directly: the two are level on in-play goals and that is correct.
        expect(home.goals).toBe(1);
        expect(away.goals).toBe(1);
        // The score of record is not.
        expect(home.score).toBe(1);
        expect(away.score).toBe(2);
        expect(home.score).not.toBe(away.score);
    });
    it('NHL: the shootout goal is NOT folded into goals, because it is the wrong number', () => {
        // `shootout.goals` is rounds converted, not the score. Adding it would read 4-3 on a
        // game that finished 2-1 — a different wrong answer, not a fix.
        const away = nhlTeamStats(fx.nhl_shootout.away);
        expect(away.shootout_goals).toBe(3);
        expect(away.shootout_goals_against).toBe(2);
        expect(away.goals).toBe(1);
        expect(away.score).toBe(2);
        expect(Number(away.goals) + Number(away.shootout_goals)).not.toBe(away.score);
        // `goals` is what check:reconciliation sums player G against. It must keep meaning
        // goals scored in play or NHL turns red on 6.69% of games.
        expect(away.goals).toBe(fx.nhl_shootout.away.statistics.total.goals);
    });
    it('NHL: a regulation win stores the same number in both', () => {
        // Positive control on the other side. Without it, `score` could be anything at all on
        // the 93.3% of games that never reach a shootout and these tests would not notice.
        const t = { points: 4, shootout: { goals: 0, shots: 0 }, statistics: { total: { goals: 4 } } };
        const s = nhlTeamStats(t);
        expect(s.score).toBe(4);
        expect(s.goals).toBe(4);
        expect(s.shootout_goals).toBe(0);
    });
    it('NHL: an absent points is absent, not zero', () => {
        // A fabricated 0 is a shutout, and check:score-of-record cannot tell the two apart.
        // fx.nhl is the trimmed block with no `points` key at all.
        const s = nhlTeamStats(fx.nhl);
        expect(s).not.toHaveProperty('score');
        // ...and a real 0 IS stored.
        expect(nhlTeamStats({ points: 0, statistics: {} }).score).toBe(0);
    });
    it('MLB: runs/hits/errors plus hitting/pitching/fielding overall, one nested level', () => {
        const s = mlbTeamStats(fx.mlb);
        expect(s.runs).toBe(7);
        expect(s.hitting_ab).toBe(37);
        expect(s.hitting_onbase_s).toBeDefined(); // nested onbase flattened
        expect(allScalar(s)).toBe(true);
    });
    it('an empty or missing block extracts to an empty record, never throws', () => {
        for (const fn of [nflTeamStats, nbaTeamStats, nhlTeamStats, mlbTeamStats]) {
            expect(fn(undefined)).toEqual({});
            expect(fn({})).toEqual({});
        }
    });
});
//# sourceMappingURL=team-stats.test.js.map