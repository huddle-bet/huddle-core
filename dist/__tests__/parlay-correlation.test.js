/**
 * Correlation-aware parlay math — ENG-295 (moved with the module from huddle-engine).
 *
 * The paired fixture is REAL stored history: Drake Maye passing_yards vs
 * Stefon Diggs receiving_yards over their 21 shared Patriots games
 * (player_game_stats, pulled 2026-08-12). Its Pearson r is +0.3405 — the
 * empirical ground the QB↔receiver prior (+0.35) stands on, and the ticket's
 * own "QB passing yards and his WR's receiving yards" example priced from
 * production data.
 *
 * The copula is pinned against the bivariate-normal closed form: for two legs
 * at p = 0.5 with correlation ρ, the joint hit probability is exactly
 * 1/4 + asin(ρ)/2π. Three-leg contradictions prove the PD repair.
 */
import { describe, it, expect } from 'vitest';
import { pearson, shrunkCorrelation, effectiveCorrelation, priorFor, toPositiveDefinite, cholesky, jointHitProbability, MIN_SHARED_GAMES, } from '../betting/parlay-correlation.js';
// Drake Maye passing_yards / Stefon Diggs receiving_yards, 21 shared games.
const MAYE = [273, 191, 268, 256, 86, 294, 270, 222, 380, 282, 295, 261, 155, 268, 179, 259, 203, 282, 281, 230, 287];
const DIGGS = [146, 43, 23, 101, 17, 20, 46, 69, 138, 14, 37, 28, 26, 16, 40, 38, 101, 26, 105, 32, 57];
describe('correlation estimation', () => {
    it('recovers the measured Pearson r from the real pair', () => {
        expect(pearson(MAYE, DIGGS)).toBeCloseTo(0.3405, 3);
    });
    it('shrinks the empirical value toward the prior by sample size', () => {
        const { r, source } = shrunkCorrelation({ a: MAYE, b: DIGGS }, 0.35);
        // (21 × 0.3405 + 10 × 0.35) / 31
        expect(r).toBeCloseTo(0.3436, 3);
        expect(source).toBe('empirical(21)');
    });
    it('below the shared-game floor the prior stands alone', () => {
        const thin = { a: MAYE.slice(0, MIN_SHARED_GAMES - 1), b: DIGGS.slice(0, MIN_SHARED_GAMES - 1) };
        expect(shrunkCorrelation(thin, 0.35)).toEqual({ r: 0.35, source: 'prior' });
        expect(shrunkCorrelation(null, 0.35)).toEqual({ r: 0.35, source: 'prior' });
    });
    it('an under leg flips the sign of the pair', () => {
        expect(effectiveCorrelation(0.4, 'over', 'over')).toBeCloseTo(0.4);
        expect(effectiveCorrelation(0.4, 'over', 'under')).toBeCloseTo(-0.4);
        expect(effectiveCorrelation(0.4, 'under', 'under')).toBeCloseTo(0.4);
    });
    it('cross-game pairs are independent by construction', () => {
        expect(priorFor('cross-game', 'passing_yards', 'receiving_yards')).toBe(0);
    });
});
describe('gaussian copula joint probability', () => {
    const seed = 12345;
    it('matches the bivariate closed form at p=0.5', () => {
        const closedForm = (rho) => 0.25 + Math.asin(rho) / (2 * Math.PI);
        for (const rho of [0.8, 0, -0.8]) {
            const joint = jointHitProbability([0.5, 0.5], [[1, rho], [rho, 1]], seed);
            expect(joint).toBeCloseTo(closedForm(rho), 1.7); // 20k sims → ±~0.01
        }
    });
    it('independence reduces to the product of marginals', () => {
        const joint = jointHitProbability([0.6, 0.7], [[1, 0], [0, 1]], seed);
        expect(joint).toBeCloseTo(0.42, 1.7);
    });
    it('a contradictory three-leg matrix is repaired, not crashed', () => {
        const contradiction = [
            [1, 0.9, 0.9],
            [0.9, 1, -0.9],
            [0.9, -0.9, 1],
        ];
        expect(cholesky(contradiction)).toBeNull(); // it really is not PD
        const { matrix, shrunkBy } = toPositiveDefinite(contradiction);
        expect(shrunkBy).toBeGreaterThan(0);
        expect(cholesky(matrix)).not.toBeNull();
        const joint = jointHitProbability([0.5, 0.5, 0.5], contradiction, seed);
        expect(Number.isFinite(joint)).toBe(true);
        expect(joint).toBeGreaterThan(0);
    });
    it('is deterministic for the same seed', () => {
        const a = jointHitProbability([0.55, 0.6], [[1, 0.3], [0.3, 1]], 42);
        const b = jointHitProbability([0.55, 0.6], [[1, 0.3], [0.3, 1]], 42);
        expect(a).toBe(b);
    });
});
//# sourceMappingURL=parlay-correlation.test.js.map