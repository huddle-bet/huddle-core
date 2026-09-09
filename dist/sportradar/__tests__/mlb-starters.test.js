import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mlbStarterIds } from '../player-stats.js';
/**
 * ENG-889. The box score's STARTERS split was dark on baseball, and the cause was not a
 * missing writer — five writers set `starter` from the provider. MLB is the one league whose
 * summary carries no player-level `starter` key at all, so `p.starter ?? false` is false for
 * everybody, correctly.
 *
 * The fixture is a REAL closed game, MIN at DET on 2026-09-08 (`061815ce`), slimmed to ids,
 * names, positions and the lineup. It is used rather than a hand-built one because the whole
 * question is what `inning` means on a substitution, and a fixture with no substitutions
 * cannot answer it. This one has seven.
 */
const SUMMARY = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '__fixtures__', 'mlb-summary-lineup.json'), 'utf8'));
const sides = [['home', SUMMARY.game.home], ['away', SUMMARY.game.away]];
describe('mlbStarterIds', () => {
    it('the fixture is a real game with real substitutions', () => {
        // Without a substitution the `inning: 0` rule is untestable: every entry would qualify
        // and any predicate at all would pass.
        for (const [side, team] of sides) {
            expect(team.lineup.length, side).toBeGreaterThan(10);
            expect(team.lineup.some((e) => e.inning > 0), side).toBe(true);
        }
    });
    it('finds exactly ten starters a side — nine fielders and the DH', () => {
        for (const [side, team] of sides) {
            const ids = mlbStarterIds(team);
            expect(ids.size, side).toBe(10);
            const positions = team.lineup.filter((e) => e.inning === 0).map((e) => e.position).sort((a, b) => a - b);
            expect(positions, side).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        }
    });
    /**
     * A lineup entry is a (player, role) event, not a player, and the naive assertion here —
     * `ids.has(e.id) === (e.inning === 0)` — fails on the real payload for that reason. Kody
     * Clemens started at position 4 and moved to 7 in the seventh, keeping batting order 3, so
     * he holds an inning-0 entry AND an inning-7 one. Spencer Torkelson is the mirror: he
     * entered at inning 6 as position 11, a pinch hitter, then took position 3 in the seventh,
     * and neither entry makes him a starter.
     *
     * So the test is per PLAYER, not per entry, which is the grain the function works at.
     */
    it('is exactly the players holding an inning-0 entry, however many entries they hold', () => {
        for (const [side, team] of sides) {
            const ids = mlbStarterIds(team);
            const everyone = new Set(team.lineup.map((e) => e.id));
            for (const id of everyone) {
                const started = team.lineup.some((e) => e.id === id && e.inning === 0);
                expect(ids.has(id), `${side} ${id}`).toBe(started);
            }
            // Both halves must be non-empty or the loop proves nothing: someone started, and
            // someone came off the bench and stayed off this list.
            expect(everyone.size, side).toBeGreaterThan(ids.size);
        }
    });
    it('keeps a starter who changed position mid-game', () => {
        // The case the naive per-entry assertion got wrong. He is a starter, and a later entry
        // must not take that away.
        const away = SUMMARY.game.away;
        const moved = away.lineup.find((e) => e.inning === 0 && away.lineup.some((o) => o.id === e.id && o.inning > 0));
        expect(moved, 'the fixture holds a starter who moved').toBeDefined();
        expect(mlbStarterIds(away).has(moved.id)).toBe(true);
    });
    it('excludes a substitute who holds two entries', () => {
        // The mirror, and the reason "appears more than once" is not the rule either: Torkelson
        // pinch-hits at inning 6 (position 11) and fields at inning 7, and started neither.
        const home = SUMMARY.game.home;
        const ids = mlbStarterIds(home);
        const twice = [...new Set(home.lineup.map((e) => e.id))]
            .filter((id) => home.lineup.filter((e) => e.id === id).length > 1 && !ids.has(id));
        expect(twice.length, 'the fixture holds a substitute with two entries').toBeGreaterThan(0);
        for (const id of twice)
            expect(ids.has(id)).toBe(false);
    });
    it('contains the starting pitcher, so the two sources agree', () => {
        // `starting_pitcher` is deliberately not unioned in. This asserts it never needed to be —
        // if it ever falls outside the set, that is a contradiction worth seeing.
        for (const [side, team] of sides) {
            expect(mlbStarterIds(team).has(team.starting_pitcher.id), side).toBe(true);
        }
    });
    it('marks nobody rather than guessing when there is no lineup', () => {
        expect(mlbStarterIds({}).size).toBe(0);
        expect(mlbStarterIds(null).size).toBe(0);
        expect(mlbStarterIds({ lineup: 'not an array' }).size).toBe(0);
    });
    it('ignores a lineup entry with no id', () => {
        expect(mlbStarterIds({ lineup: [{ inning: 0 }, { id: '', inning: 0 }, { id: 'a', inning: 0 }] }).size).toBe(1);
    });
});
//# sourceMappingURL=mlb-starters.test.js.map