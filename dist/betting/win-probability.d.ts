/**
 * Win-probability and calibration owners — moved here from huddle-engine's
 * ev-detector.ts (ENG-295) so huddle-api can price parlays with the SAME
 * functions the EV detector runs, rather than a second implementation that
 * drifts. huddle-engine re-exports these from ev-detector.ts, so its internal
 * call sites and the calibration story are unchanged; this file is the single
 * owner.
 *
 * The calibration table's constants come from resolved pick outcomes measured
 * in huddle-engine (counts inline below). New measurements land HERE.
 */
/** Look up base shrink factor. Tries side-specific key first, then stat-only, then default.
 *  Exported for the parlay wiring (ENG-295): parlay marginals must carry the same
 *  calibration the EV path applies, or every parlay overstates its edge. */
export declare function getBaseShrink(league: string, stat: string, side?: 'over' | 'under'): number;
/**
 * Graduated shrinkage: full shrink near 50%, tapering to no shrink at 75%+.
 * Weekend data (14.5K picks, Apr 4-6) showed:
 *   - 50-55% predicted → 53.5% actual (well calibrated with shrink)
 *   - 55-60% predicted → 59.1% actual (well calibrated)
 *   - 60-65% predicted → 78.2% actual (shrink too aggressive — 15pp under-confident)
 *   - 65%+   predicted → 79.4% actual (shrink too aggressive — 12pp under-confident)
 * Raw model probabilities above ~70% were accurate; shrinkage was destroying that signal.
 */
export declare function applyShrinkage(rawProb: number, baseShrink: number): number;
/**
 * Normalise the several characters that render as a minus sign but are not one.
 *
 * DraftKings sends U+2212 MINUS SIGN, not U+002D HYPHEN-MINUS. The two are
 * visually identical. huddle-odds measured it on 1,324 of DraftKings' 2,382
 * odds_current rows and now normalises at write time, so this is currently
 * latent — but the failure mode here is worse than theirs was, and worth
 * closing at the point of use:
 *
 *   parseInt('\u2212110')                 -> NaN     (their case: a dropped row)
 *   '\u2212110'.replace(/[^-\d]/g, '')    -> '110'   (ours: +110, a sign flip)
 *
 * The strip-then-parse below deletes an unrecognised character rather than
 * failing on it, so a minus that is not a hyphen silently inverts the price and
 * every downstream EV number with it. En dash and em dash are covered too.
 */
export declare function toAsciiOdds(american: string): string;
/** Convert American odds to implied probability (no-vig) */
export declare function oddsToImpliedProb(american: string): number | null;
/** Convert American odds to decimal payout (profit per $1 wagered) */
export declare function oddsToDecimalPayout(american: string): number | null;
/** Normal CDF approximation — probability that X <= z */
export declare function normalCdf(z: number): number;
/** Given projection mean/stddev and a line, what's the probability of going over?
 *  Automatically uses Poisson for low-mean stats (< 3) where discrete outcomes
 *  dominate (0, 1, 2). Normal distribution for higher-count continuous stats.
 */
export declare function probOver(projected: number, stdDev: number, line: number, statType?: string, expectedValue?: number): number;
//# sourceMappingURL=win-probability.d.ts.map