import { describe, expect, it } from 'vitest';
import { summaryLineScore } from '../player-stats.js';
import { SUMMARY_SCORING } from '../__fixtures__/summary-scoring.js';
/**
 * ENG-890. `MatchGameData.lineScore` is `{periods, away, home, awayTotal, homeTotal}` and
 * nothing has ever filled it but the demo fixture, so a live game's Game tab had no line score
 * to draw. The summary carries it per team under `scoring[]`, on the payload huddle-live
 * already polls for player stats — no new fetch.
 *
 * The fixture is three REAL closed games because all three traps below are in them and a
 * hand-built one would have had none.
 */
const sport = (k) => SUMMARY_SCORING[k];
describe('summaryLineScore', () => {
    it('reads baseball innings in order, keeping the genuine zeroes', () => {
        const ls = summaryLineScore(sport('mlb'));
        expect(ls.periods).toEqual(['1', '2', '3', '4', '5', '6']);
        expect(ls.home).toEqual([0, 0, 3, 0, 2, 0]);
        expect(ls.away).toEqual([0, 0, 3, 0, 0, 0]);
    });
    /**
     * The NHL array arrives REVERSED — numbers 3, 2, 1 — so anything that trusts array order
     * puts the third period's goals in the first period's column. Sorting is not a tidy-up here,
     * it is the difference between a right and a wrong line score.
     */
    it('sorts hockey periods, which the provider sends backwards', () => {
        const raw = SUMMARY_SCORING.nhl.home.scoring;
        expect(raw.map((e) => e.number), 'the fixture is genuinely reversed').toEqual([3, 2, 1]);
        const ls = summaryLineScore(sport('nhl'));
        expect(ls.periods).toEqual(['1', '2', '3']);
        expect(ls.home).toEqual([1, 2, 1]);
        expect(ls.away).toEqual([0, 0, 2]);
    });
    /**
     * The NBA array repeats `number` — 1, 2, 3, 4, 1 — because the fifth entry is overtime and
     * `number` is a label WITHIN a period type. Only `sequence` is a position. Keying on
     * `number` collides OT1 with Q1 and silently loses a quarter.
     */
    it('does not collide overtime with the first quarter', () => {
        const raw = SUMMARY_SCORING.nba.home.scoring;
        expect(raw.map((e) => e.number), 'the fixture genuinely repeats number 1').toEqual([1, 2, 3, 4, 1]);
        const ls = summaryLineScore(sport('nba'));
        expect(ls.periods).toEqual(['1', '2', '3', '4', 'OT']);
        expect(ls.home).toEqual([21, 26, 38, 24, 10]);
        expect(ls.home.length, 'five columns, not four').toBe(5);
    });
    it('takes the total from the team, not from the columns', () => {
        const ls = summaryLineScore(sport('mlb'));
        expect(ls.homeTotal).toBe(5);
        expect(ls.awayTotal).toBe(3);
    });
    /**
     * A half never batted is null, never 0. MLB lists every inning batted INCLUDING the
     * scoreless ones, so absence means the half did not happen — a home side leading after the
     * top of the ninth never bats, and the client's own test asserts eight home entries against
     * nine away. Filling those with 0 says the team batted and failed to score, which is a
     * different and wrong claim.
     */
    it('leaves a half that was never played null, not zero', () => {
        const ls = summaryLineScore({
            game: {
                home: { runs: 2, scoring: [{ sequence: 1, number: 1, type: 'inning', runs: 2 }] },
                away: { runs: 0, scoring: [
                        { sequence: 1, number: 1, type: 'inning', runs: 0 },
                        { sequence: 2, number: 2, type: 'inning', runs: 0 },
                    ] },
            },
        });
        expect(ls.away).toEqual([0, 0]);
        expect(ls.home).toEqual([2, null]);
    });
    it('says nothing rather than guessing when there is no scoring block', () => {
        expect(summaryLineScore({ game: { home: {}, away: {} } })).toBeNull();
        expect(summaryLineScore(null)).toBeNull();
        expect(summaryLineScore({})).toBeNull();
    });
});
//# sourceMappingURL=line-score.test.js.map