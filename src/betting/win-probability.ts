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

/**
 * Side-specific EV threshold adjustment.
 *
 * §5 Q6 asked whether this compounds with the per-side entries in
 * CALIBRATION_SHRINK. It does, and the arithmetic is not subtle: the shrink
 * raises an under's *probability* (nba:rebounds:under is 1.47, so the model is
 * told it is under-confident there), which raises its EV — and then this lowers
 * the *bar* that EV has to clear by another half point. The same belief that
 * unders outperform is expressed twice, in two places, neither of which
 * mentions the other.
 *
 * If the calibration were right, the EV number would already be right and no
 * side-specific threshold would be needed at all. This is a hedge against the
 * calibration being wrong.
 *
 * Deliberately kept for now, and it should go. Removing it today would swap one
 * unvalidated adjustment for another, because the calibration table it hedges
 * is itself fitted to a dataset no longer in the database — 256 rows in
 * pick_outcomes against a cited 16,430. Delete this at the same time as
 * CALIBRATION_SHRINK is re-fitted, not before, so the two moves can be measured
 * against each other. PLAN.md stage 4.
 *
 * Original note: weekend data (14.5K picks) showed under 5-8% EV hitting 83.1%
 * and over 5-8% EV hitting 53.0%.
 */
const SIDE_EV_MODIFIER: Record<string, number> = {
  over: 0.01,   // +1% stricter for overs
  under: -0.005, // -0.5% looser for unders
};

// STAT_MIN_EV + LEAGUE_STAT_MIN_EV moved to the `ev_thresholds` Supabase
// table + `./ev-thresholds.ts` singleton (with hardcoded fallback mirroring
// the seed data). Retune by UPDATE-ing the table; changes take effect within
// one 5-min TTL window, no redeploy.

// ─── Per-stat calibration shrinkage ────────────────────────────────────────
// Derived from live pick_outcomes calibration report (16K+ resolved picks, 2026-04-06).
// Key: "league:stat" → base shrink factor.
// Applied via graduated shrinkage: full shrink near 50%, tapering to no shrink at 75%+.
// Weekend data showed raw model is well-calibrated at high confidence (60%+ predicted
// had 78-79% actual hit rate) — linear shrink was destroying that accuracy.

// Per-side calibration: over and under behave very differently.
// Recalibrated from 16,430 resolved picks (all-time as of 2026-04-06).
// Format: 'league:stat:side' → shrink ratio (actual_hit_rate / predicted_prob).
// Values > 1.0 = model under-confident (can be more aggressive)
// Values < 1.0 = model over-confident (needs dampening)
const CALIBRATION_SHRINK: Record<string, number> = {
  // NHL (7,563 picks) — unders consistently outperform, saves massively under-confident
  'nhl:shots:over': 1.04,   'nhl:shots:under': 1.20,   // n=3489/2428
  'nhl:hits:over': 0.95,    'nhl:hits:under': 1.20,    // n=2096/1368
  'nhl:saves:under': 1.65,                               // n=132, 97% hit rate
  'nhl:goals:over': 0.76,                                // n=50, heavily over-confident

  // NBA (5,929 picks) — rebounds:under is a gold mine, turnovers:under is a trap
  'nba:points:over': 1.18,   'nba:points:under': 0.94,  // n=1171/803
  'nba:rebounds:over': 0.87, 'nba:rebounds:under': 1.47, // n=846/695
  'nba:assists:over': 1.10,  'nba:assists:under': 1.27,  // n=631/345
  'nba:threes:over': 1.44,   'nba:threes:under': 1.05,  // n=297/163
  'nba:turnovers:over': 1.23, 'nba:turnovers:under': 0.78, // n=735/196
  'nba:steals:over': 1.33,                               // n=47
  'nba:blocks:over': 1.48,                               // n=45

  // MLB (673 picks) — runs:over is the main market, slightly over-confident
  'mlb:runs:over': 0.90,                                   // n=673
  'mlb:strikeouts': 0.70,
  'mlb:hits_allowed': 0.75,

  // Esports (no resolved pick data yet — start at neutral)
  'cs2:kills': 0.63, 'cs2:kills_2map': 0.63, 'cs2:deaths': 0.63, 'cs2:headshots': 0.63,
  'valorant:kills': 0.63, 'valorant:deaths': 0.63, 'valorant:assists': 0.63,
  'lol:kills': 0.63, 'lol:deaths': 0.63, 'lol:assists': 0.63, 'lol:fantasy': 0.63,
  'dota2:kills': 0.63, 'dota2:deaths': 0.63, 'dota2:assists': 0.63,
  'cod:kills': 0.63, 'cod:deaths': 0.63, 'cod:fantasy': 0.63,
};

const DEFAULT_CALIBRATION_SHRINK = 0.63;

/** Look up base shrink factor. Tries side-specific key first, then stat-only, then default.
 *  Exported for the parlay wiring (ENG-295): parlay marginals must carry the same
 *  calibration the EV path applies, or every parlay overstates its edge. */
export function getBaseShrink(league: string, stat: string, side?: 'over' | 'under'): number {
  if (side) {
    const sideShrink = CALIBRATION_SHRINK[`${league}:${stat}:${side}`];
    if (sideShrink != null) return sideShrink;
  }
  return CALIBRATION_SHRINK[`${league}:${stat}`] ?? DEFAULT_CALIBRATION_SHRINK;
}

/**
 * Graduated shrinkage: full shrink near 50%, tapering to no shrink at 75%+.
 * Weekend data (14.5K picks, Apr 4-6) showed:
 *   - 50-55% predicted → 53.5% actual (well calibrated with shrink)
 *   - 55-60% predicted → 59.1% actual (well calibrated)
 *   - 60-65% predicted → 78.2% actual (shrink too aggressive — 15pp under-confident)
 *   - 65%+   predicted → 79.4% actual (shrink too aggressive — 12pp under-confident)
 * Raw model probabilities above ~70% were accurate; shrinkage was destroying that signal.
 */
export function applyShrinkage(rawProb: number, baseShrink: number): number {
  const distance = rawProb - 0.5;
  const absDistance = Math.abs(distance);
  // Full base shrink at 50%, linearly taper to no shrink at raw ≥ 75%
  const taper = Math.min(absDistance / 0.25, 1.0);
  const effectiveShrink = baseShrink + (1 - baseShrink) * taper;
  return 0.5 + distance * effectiveShrink;
}

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
export function toAsciiOdds(american: string): string {
  return american.replace(/[\u2212\u2013\u2014]/g, '-');
}

/** Convert American odds to implied probability (no-vig) */
export function oddsToImpliedProb(american: string): number | null {
  const num = parseInt(toAsciiOdds(american).replace(/[^-\d]/g, ''));
  if (isNaN(num) || num === 0) return null;
  if (num > 0) return 100 / (num + 100);
  return Math.abs(num) / (Math.abs(num) + 100);
}

/** Convert American odds to decimal payout (profit per $1 wagered) */
export function oddsToDecimalPayout(american: string): number | null {
  const num = parseInt(toAsciiOdds(american).replace(/[^-\d]/g, ''));
  if (isNaN(num) || num === 0) return null;
  if (num > 0) return num / 100;
  return 100 / Math.abs(num);
}

/** Normal CDF approximation — probability that X <= z */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327; // 1/sqrt(2*pi)
  const p = d * Math.exp(-z * z / 2) * (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744)))));
  return z > 0 ? 1 - p : p;
}

/** Poisson CDF: P(X <= k) for Poisson with mean lambda */
function poissonCdf(k: number, lambda: number): number {
  if (lambda <= 0) return k >= 0 ? 1 : 0;
  let sum = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i <= Math.floor(k); i++) {
    sum += term;
    term *= lambda / (i + 1);
  }
  return Math.min(sum, 1);
}

/** Given projection mean/stddev and a line, what's the probability of going over?
 *  Automatically uses Poisson for low-mean stats (< 3) where discrete outcomes
 *  dominate (0, 1, 2). Normal distribution for higher-count continuous stats.
 */
export function probOver(
  projected: number,
  stdDev: number,
  line: number,
  statType?: string,
  expectedValue?: number,
): number {
  /**
   * A Poisson `lambda` and a normal `mu` are **means**. `projected` is not always one.
   *
   * For low-count stats the model uses the median of past games, which is the right
   * estimator for the point forecast — MAE is minimised by the median, and the backtest
   * rejects anything else. But for an event rarer than every-other-game the median is
   * structurally zero, and a zero mean is not a distribution: it says the player never
   * does the thing.
   *
   * Measured 2026-08-07, MLB: 95% of players with 20+ games have a median of zero home
   * runs. Yordan Alvarez hit 36 in 126 games and projected 0.000 — the same number as a
   * light-hitting infielder. Both were then priced identically, which is why home-run
   * projections correlated 0.100 with actual performance while strikeouts managed 0.975.
   *
   * The damage was never the point estimate. It was that the pricing path could not tell
   * two players apart. So the median stays where it belongs and the *distribution* gets a
   * mean, which is what it was always asking for.
   *
   * Only when the projection has actually collapsed. Substituting the flat season mean for
   * a healthy recency-weighted projection would throw away the recency weighting, which is
   * a different and worse change.
   */
  const mean = projected === 0 && expectedValue != null && expectedValue > 0
    ? expectedValue
    : projected;

  if (stdDev <= 0) return mean > line ? 0.85 : 0.15;

  // Use Poisson for any stat with low projected mean (< 3)
  // These are inherently discrete: goals, HR, steals, blocks, assists (NHL), etc.
  // Poisson gives much better tail probabilities than normal for 0-1-2 outcomes
  if (mean < 3 && line < 5 && mean > 0) {
    // Widened by the same model-uncertainty the normal branch gets, which this
    // branch ignored entirely — it takes `stdDev` and then does not use it.
    //
    // A Poisson has variance = mean, so there is no separate spread to scale.
    // The equivalent hedge is to inflate the mean by however much the caller
    // widened the spread, which is what `stdDev / rawStdDev` recovers. Without
    // it, exactly the stats that most need hedging — home runs, goals, steals,
    // blocks — were the only ones priced with no hedge at all, and they are
    // also the ones carrying explicit STAT_UNCERTAINTY_BOOST entries that were
    // therefore doing nothing.
    //
    // Bounded: an unbounded ratio would let a boosted stat drift the mean far
    // enough to change the pick's side rather than only its confidence.
    const variance = Math.max(mean, stdDev * stdDev);
    const hedged = Math.min(mean * 1.5, Math.max(mean, Math.sqrt(variance)));
    return 1 - poissonCdf(Math.floor(line), hedged);
  }

  // For continuous/high-count stats: use normal distribution
  const z = (line - mean) / stdDev;
  return 1 - normalCdf(z);
}
