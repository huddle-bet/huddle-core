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

import { normalCdf } from './win-probability.js';

export type LegSide = 'over' | 'under';

/** How two legs relate structurally. Decides which prior applies. */
export type PairRelation =
  | 'same-player'
  | 'same-team'
  | 'opponents'
  | 'same-game-other'
  | 'cross-game';

export interface PairCorrelation {
  r: number;
  /** 'empirical(n)' when shared-game history decided it, 'prior' when the table did. */
  source: string;
}

/** Pearson correlation over paired samples. NaN-safe: <2 points or zero variance → 0. */
export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]!; sb += b[i]!; }
  const ma = sa / n, mb = sb / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i]! - ma, db = b[i]! - mb;
    cov += da * db; va += da * da; vb += db * db;
  }
  if (va === 0 || vb === 0) return 0;
  return cov / Math.sqrt(va * vb);
}

/**
 * The structured prior, keyed by relation and stat pair. Deliberately small,
 * each entry with its reason; an unlisted same-game pair gets the generic
 * value for its relation. Cross-game is 0 by construction — game outcomes are
 * independent at the level this engine models.
 *
 * The QB↔receiver value is not a guess: Drake Maye passing_yards vs Stefon
 * Diggs receiving_yards measured +0.34 over 21 shared stored games, Hunter
 * Henry +0.38 — the empirical path lands where this table starts.
 */
const VOLUME_PAIRS: Array<[string, string, number]> = [
  // A QB's passing production and his catchers' receiving production are the
  // same footballs. Symmetric — matched in either order.
  ['passing_yards', 'receiving_yards', 0.35],
  ['passing_touchdowns', 'receiving_touchdowns', 0.45],
  // CS2: a long series inflates every counting stat on both sides.
  ['kills', 'kills', 0.35],
];

export function priorFor(relation: PairRelation, statA: string, statB: string): number {
  if (relation === 'cross-game') return 0;
  if (relation === 'same-player') {
    // Same player, same stat, both legs = the same number twice.
    if (statA === statB) return 0.9;
    // Same player, different stats share minutes/usage/game script.
    return 0.35;
  }
  for (const [x, y, r] of VOLUME_PAIRS) {
    if ((statA === x && statB === y) || (statA === y && statB === x)) {
      if (relation === 'same-team') return r;
      // The CS2 kills↔kills entry is an opponents pair: more rounds lift both.
      if (relation === 'opponents') return r;
    }
  }
  if (relation === 'same-team') return 0.15;   // shared game script, mildly positive
  if (relation === 'opponents') return -0.05;  // one team's volume mildly crowds the other's
  return 0.1;                                   // same game, structure unknown
}

/**
 * Empirical-with-shrinkage (approved default 1). k = 10 pseudo-observations of
 * the prior: at n = 10 shared games the data and the table split the estimate;
 * by n = 30 the data dominates. Below MIN_SHARED the sample is noise and the
 * prior stands alone.
 */
export const MIN_SHARED_GAMES = 8;
const SHRINK_K = 10;

export function shrunkCorrelation(
  paired: { a: number[]; b: number[] } | null,
  prior: number,
): PairCorrelation {
  const n = paired ? Math.min(paired.a.length, paired.b.length) : 0;
  if (!paired || n < MIN_SHARED_GAMES) return { r: prior, source: 'prior' };
  const emp = pearson(paired.a, paired.b);
  const r = (n * emp + SHRINK_K * prior) / (n + SHRINK_K);
  return { r, source: `empirical(${n})` };
}

/** Correlation of the LEGS is the correlation of the stats, signed by side. */
export function effectiveCorrelation(r: number, sideA: LegSide, sideB: LegSide): number {
  const sign = (s: LegSide) => (s === 'over' ? 1 : -1);
  return r * sign(sideA) * sign(sideB);
}

/**
 * Correlation matrix from pairwise entries, forced positive-definite by
 * shrinking toward identity. Pairwise-estimated matrices are not guaranteed
 * PD (three legs at +0.9, +0.9, −0.9 is a contradiction); shrinking is the
 * standard honest repair — it weakens every correlation slightly rather than
 * silently rewriting one.
 */
export function toPositiveDefinite(matrix: number[][]): { matrix: number[][]; shrunkBy: number } {
  let m = matrix;
  let lambda = 0;
  for (let attempt = 0; attempt < 25; attempt++) {
    if (cholesky(m)) return { matrix: m, shrunkBy: lambda };
    lambda = lambda === 0 ? 0.05 : Math.min(1, lambda * 1.5);
    const dim = matrix.length;
    m = matrix.map((row, i) =>
      row.map((v, j) => (i === j ? 1 : v * (1 - lambda))),
    );
    void dim;
  }
  // Full shrink is the identity, which is always PD; unreachable in practice.
  return { matrix: matrix.map((row, i) => row.map((_, j) => (i === j ? 1 : 0))), shrunkBy: 1 };
}

/** Lower-triangular Cholesky factor, or null when the matrix is not PD. */
export function cholesky(m: number[][]): number[][] | null {
  const n = m.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = m[i]![j]!;
      for (let k = 0; k < j; k++) sum -= L[i]![k]! * L[j]![k]!;
      if (i === j) {
        if (sum <= 1e-10) return null;
        L[i]![i] = Math.sqrt(sum);
      } else {
        L[i]![j] = sum / L[j]![j]!;
      }
    }
  }
  return L;
}

/** mulberry32 — the same generator monte-carlo.ts uses, for the same reason:
 *  a seeded stream makes two processes pricing the same parlay agree. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIMS = 20_000;

/**
 * Joint hit probability under a Gaussian copula: draw z ~ N(0, Σ) via the
 * Cholesky factor, leg i hits iff Φ(z_i) ≤ p_i. Exact for the marginals by
 * construction (each Φ(z_i) is uniform), and the copula carries exactly the
 * pairwise dependence estimated upstream — no closed form exists for 3+
 * correlated legs, which is why this is simulation rather than a formula.
 */
export function jointHitProbability(
  marginals: number[],
  correlation: number[][],
  seed: number,
): number {
  const { matrix } = toPositiveDefinite(correlation);
  const L = cholesky(matrix);
  if (!L) return marginals.reduce((p, m) => p * m, 1); // identity fallback — independent
  const n = marginals.length;
  const rand = mulberry32(seed);
  // Box–Muller pairs from the seeded stream.
  const gauss = () => {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  let hits = 0;
  const eps = new Array<number>(n);
  for (let s = 0; s < SIMS; s++) {
    for (let i = 0; i < n; i++) eps[i] = gauss();
    let all = true;
    for (let i = 0; i < n; i++) {
      let z = 0;
      for (let k = 0; k <= i; k++) z += L[i]![k]! * eps[k]!;
      if (normalCdf(z) > marginals[i]!) { all = false; break; }
    }
    if (all) hits++;
  }
  return hits / SIMS;
}

/** The user-facing signal: one score, one word. The score is the mean pairwise
 *  effective correlation — what a bettor feels as "these help/hurt each other". */
export function correlationSignal(pairwise: number[]): { score: number; label: 'boosts' | 'independent' | 'fights' } {
  if (pairwise.length === 0) return { score: 0, label: 'independent' };
  const score = pairwise.reduce((s, r) => s + r, 0) / pairwise.length;
  const label = score > 0.1 ? 'boosts' : score < -0.1 ? 'fights' : 'independent';
  return { score: Math.round(score * 100) / 100, label };
}
