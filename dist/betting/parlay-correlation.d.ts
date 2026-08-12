/**
 * Correlation-aware parlay pricing — ENG-295. Pure math, no I/O. Moved here
 * from huddle-engine so huddle-api can price parlays with the same model;
 * huddle-engine re-exports this module from src/engine/parlay/core.ts, so
 * there is exactly one implementation. The naive independent-legs calculator
 * in ./calculators.ts stays what it is — this module is what replaces its
 * assumption when legs share a game.
 *
 * The design constraint from the Tools spec: correlation must be modelled
 * properly and surfaced simply. The modelling here is a Gaussian copula over
 * the legs' marginal win probabilities, with pairwise correlations taken from
 * shared-game history and shrunk toward a small structured prior when history
 * is thin (both defaults approved by Cam on ENG-295, 2026-08-12). Combined
 * odds are the trivial part and stay trivial: the payout is the product of
 * the legs' own book prices; the fair number is 1 / the copula probability.
 */
export type LegSide = 'over' | 'under';
/** How two legs relate structurally. Decides which prior applies. */
export type PairRelation = 'same-player' | 'same-team' | 'opponents' | 'same-game-other' | 'cross-game';
export interface PairCorrelation {
    r: number;
    /** 'empirical(n)' when shared-game history decided it, 'prior' when the table did. */
    source: string;
}
/** Pearson correlation over paired samples. NaN-safe: <2 points or zero variance → 0. */
export declare function pearson(a: number[], b: number[]): number;
export declare function priorFor(relation: PairRelation, statA: string, statB: string): number;
/**
 * Empirical-with-shrinkage (approved default 1). k = 10 pseudo-observations of
 * the prior: at n = 10 shared games the data and the table split the estimate;
 * by n = 30 the data dominates. Below MIN_SHARED the sample is noise and the
 * prior stands alone.
 */
export declare const MIN_SHARED_GAMES = 8;
export declare function shrunkCorrelation(paired: {
    a: number[];
    b: number[];
} | null, prior: number): PairCorrelation;
/** Correlation of the LEGS is the correlation of the stats, signed by side. */
export declare function effectiveCorrelation(r: number, sideA: LegSide, sideB: LegSide): number;
/**
 * Correlation matrix from pairwise entries, forced positive-definite by
 * shrinking toward identity. Pairwise-estimated matrices are not guaranteed
 * PD (three legs at +0.9, +0.9, −0.9 is a contradiction); shrinking is the
 * standard honest repair — it weakens every correlation slightly rather than
 * silently rewriting one.
 */
export declare function toPositiveDefinite(matrix: number[][]): {
    matrix: number[][];
    shrunkBy: number;
};
/** Lower-triangular Cholesky factor, or null when the matrix is not PD. */
export declare function cholesky(m: number[][]): number[][] | null;
/**
 * Joint hit probability under a Gaussian copula: draw z ~ N(0, Σ) via the
 * Cholesky factor, leg i hits iff Φ(z_i) ≤ p_i. Exact for the marginals by
 * construction (each Φ(z_i) is uniform), and the copula carries exactly the
 * pairwise dependence estimated upstream — no closed form exists for 3+
 * correlated legs, which is why this is simulation rather than a formula.
 */
export declare function jointHitProbability(marginals: number[], correlation: number[][], seed: number): number;
/** The user-facing signal: one score, one word. The score is the mean pairwise
 *  effective correlation — what a bettor feels as "these help/hurt each other". */
export declare function correlationSignal(pairwise: number[]): {
    score: number;
    label: 'boosts' | 'independent' | 'fights';
};
//# sourceMappingURL=parlay-correlation.d.ts.map