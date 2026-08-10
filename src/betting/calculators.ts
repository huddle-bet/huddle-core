/**
 * The interactive calculators — ENG-295 parlay, ENG-329 hedge, ENG-294 arbitrage,
 * ENG-296 promo conversion.
 *
 * Pure functions over numbers the caller supplies. No database, no market sweep: if it
 * runs on a schedule over every game it is an engine job, and if it answers one request
 * about one situation it belongs here.
 *
 * These live in core rather than behind an HTTP endpoint because they need no data. A
 * round trip to compute `(1 + 150/100) * stake` is latency the client can simply not
 * spend, and at the concurrency huddle-api is sized for it is four more routes to cache,
 * rate-limit and scale for no benefit. The client imports them; the API serves the
 * engine's output instead.
 *
 * Every result reports what it assumed. A hedge number without its assumption is a
 * number someone will act on and then be surprised by.
 */
import {
  americanToDecimal,
  decimalToAmerican,
  devig,
  impliedProbability,
  money,
  OddsError,
} from './odds.js';

export interface ParlayLeg {
  /** American odds, as books quote them. */
  odds: number;
  /**
   * The other side of the same market, if the caller has it.
   *
   * Required to say anything about vig. A single price cannot be devigged — its implied
   * probability *is* the book's number plus their margin, and there is nothing in it
   * that separates the two. Supply this and the leg gets a fair probability; leave it
   * out and the result reports the implied number and admits it is not fair.
   */
  oppositeOdds?: number;
  label?: string;
}

export interface ParlayResult {
  decimal: number;
  american: number;
  /** Chance every leg lands at the quoted prices, vig included. */
  impliedProbability: number;
  /**
   * The same figure with each leg's vig removed — null unless every leg supplied its
   * opposite price. Partial devigging would mix fair and vigged legs into one number
   * that means neither.
   */
  fairProbability: number | null;
  payout: number;
  profit: number;
  /**
   * What the book keeps across the parlay, as a percentage. Null for the same reason as
   * `fairProbability`. This compounds across legs, and it is the thing parlay bettors
   * most consistently underestimate — which is exactly why reporting a fake 0 would be
   * worse than reporting nothing.
   */
  holdPct: number | null;
  assumptions: string[];
}

/**
 * Combined price for a set of legs.
 *
 * Decimal odds multiply; that part is exact. The probability is not, and the result says
 * so: a parlay's true chance is only the product of leg probabilities when the legs are
 * independent, and the correlated case is the one people reach for — same-game legs
 * where the quarterback throwing for 300 yards and the receiver going over both depend
 * on the game script.
 *
 * Correlation is deliberately not modelled here. A wrong correlation estimate is worse
 * than none, because it produces a confident number instead of a caveat. Books price
 * same-game parlays with their own correlation model and this cannot see it.
 */
export function parlay(legs: ParlayLeg[], stake: number): ParlayResult {
  if (legs.length < 2) throw new OddsError('a parlay needs at least two legs');
  if (legs.length > 15) throw new OddsError('a parlay above fifteen legs is not priced here');
  if (!(stake > 0)) throw new OddsError('stake must be positive');

  const decimals = legs.map((l) => americanToDecimal(l.odds));
  const combined = decimals.reduce((a, b) => a * b, 1);
  const impliedProb = decimals.map(impliedProbability).reduce((a, b) => a * b, 1);

  // Only devig when every leg brought its other side.
  //
  // An earlier version faked this by treating the opposite as the exact complement of
  // the quoted price. That construction always sums to 1, so the normalisation was a
  // no-op: `fairProbability` came out equal to `impliedProbability` and the hold was
  // reported as 0.00% for every parlay ever priced. A confident wrong number, on the
  // single figure this tool exists to expose.
  const complete = legs.every((l) => l.oppositeOdds !== undefined);
  const fairProbability = complete
    ? legs.reduce((acc, leg, i) => {
        const [fair] = devig([decimals[i], americanToDecimal(leg.oppositeOdds!)]);
        return acc * fair;
      }, 1)
    : null;

  const payout = stake * combined;
  return {
    decimal: Math.round(combined * 10_000) / 10_000,
    american: decimalToAmerican(combined),
    impliedProbability: Math.round(impliedProb * 10_000) / 10_000,
    fairProbability: fairProbability === null ? null : Math.round(fairProbability * 10_000) / 10_000,
    payout: money(payout),
    profit: money(payout - stake),
    // Positive means the book keeps it: the parlay pays as though it is less likely than
    // the devigged legs say it is.
    holdPct:
      fairProbability === null
        ? null
        : Math.round((1 - impliedProb / fairProbability) * -10_000) / 100,
    assumptions: [
      'Legs are treated as independent. Same-game legs are correlated and this does not model that.',
      ...(complete
        ? []
        : ['Vig is not removed — supply oppositeOdds on every leg for a fair probability and hold.']),
    ],
  };
}

export interface HedgeResult {
  /** Stake on the opposing side to level the outcomes. */
  hedgeStake: number;
  /** Profit if the original bet wins, after the hedge stake. */
  profitIfOriginalWins: number;
  /** Profit if the hedge wins, after the original stake. */
  profitIfHedgeWins: number;
  /** The locked amount when both are equal — the point of hedging. */
  guaranteedProfit: number;
  /** True when no hedge stake produces a profit on both sides. */
  guaranteedLoss: boolean;
  assumptions: string[];
}

/**
 * The stake that makes both outcomes pay the same.
 *
 * With an original stake S at decimal D, hedged at decimal H:
 *
 *     original wins   S·D − S − X
 *     hedge wins      X·H − S − X
 *
 * Setting them equal gives X = S·D / H, and the locked profit is S·D/H·(H−1) − S.
 *
 * A negative guaranteed profit is a real and common answer — it is what hedging a losing
 * position costs to make certain. It is reported rather than suppressed, because the
 * decision "lock in a smaller loss" needs the number.
 */
export function hedge(originalStake: number, originalOdds: number, hedgeOdds: number): HedgeResult {
  if (!(originalStake > 0)) throw new OddsError('stake must be positive');
  const d = americanToDecimal(originalOdds);
  const h = americanToDecimal(hedgeOdds);

  const hedgeStake = (originalStake * d) / h;
  const ifOriginal = originalStake * d - originalStake - hedgeStake;
  const ifHedge = hedgeStake * h - originalStake - hedgeStake;

  return {
    hedgeStake: money(hedgeStake),
    profitIfOriginalWins: money(ifOriginal),
    profitIfHedgeWins: money(ifHedge),
    guaranteedProfit: money(Math.min(ifOriginal, ifHedge)),
    guaranteedLoss: Math.min(ifOriginal, ifHedge) < 0,
    assumptions: [
      'Both prices are available at the stakes shown; a book may limit the hedge.',
      'The two outcomes are exhaustive — a push or void breaks the lock.',
    ],
  };
}

export interface ArbitrageLeg {
  odds: number;
  book?: string;
}

export interface ArbitrageResult {
  exists: boolean;
  /** Sum of implied probabilities. Below 1 is an arbitrage; the gap is the edge. */
  totalImplied: number;
  /** Return per unit staked, guaranteed. 1.02 means 2% on the total outlay. */
  returnMultiple: number;
  profitPct: number;
  stakes: Array<{ book?: string; stake: number; returns: number }>;
  assumptions: string[];
}

/**
 * Split a total stake across mutually exclusive outcomes so every result pays the same.
 *
 * An arbitrage exists when the implied probabilities sum below 1. Stakes are allocated
 * in proportion to each leg's implied probability, which makes the return identical
 * whichever way it lands.
 *
 * Reports `exists: false` with the real numbers rather than refusing. Seeing how far
 * short a near-arb falls is the useful answer — it is the difference between "wait" and
 * "this market will never be arbable".
 */
export function arbitrage(legs: ArbitrageLeg[], totalStake: number): ArbitrageResult {
  if (legs.length < 2) throw new OddsError('arbitrage needs at least two outcomes');
  if (!(totalStake > 0)) throw new OddsError('total stake must be positive');

  const decimals = legs.map((l) => americanToDecimal(l.odds));
  const implied = decimals.map(impliedProbability);
  const totalImplied = implied.reduce((a, b) => a + b, 0);
  const returnMultiple = 1 / totalImplied;

  const stakes = legs.map((leg, i) => {
    const stake = totalStake * (implied[i] / totalImplied);
    return { book: leg.book, stake: money(stake), returns: money(stake * decimals[i]) };
  });

  return {
    exists: totalImplied < 1,
    totalImplied: Math.round(totalImplied * 10_000) / 10_000,
    returnMultiple: Math.round(returnMultiple * 10_000) / 10_000,
    profitPct: Math.round((returnMultiple - 1) * 10_000) / 100,
    stakes,
    assumptions: [
      'The outcomes are mutually exclusive and exhaustive.',
      'Both prices survive until both bets are placed — the usual reason a live arbitrage does not pay.',
      'Stake limits and account restrictions are not modelled.',
    ],
  };
}

export interface FreeBetResult {
  hedgeStake: number;
  guaranteedProfit: number;
  /** Cash kept per unit of free bet. The number that makes promos comparable. */
  conversionPct: number;
  assumptions: string[];
}

/**
 * What a stake-not-returned free bet is actually worth, hedged.
 *
 * A free bet returns profit only — win at decimal D and you keep F·(D−1), not F·D. That
 * one difference is why a $100 free bet is not worth $100, and why laying it off at long
 * odds converts better than at short ones.
 *
 * Hedging at decimal H:
 *
 *     free bet wins   F·(D−1) − X
 *     hedge wins      X·(H−1)
 *
 * Equal at X = F·(D−1)/H, locking F·(D−1)·(H−1)/H.
 */
export function freeBetConversion(freeBetAmount: number, freeBetOdds: number, hedgeOdds: number): FreeBetResult {
  if (!(freeBetAmount > 0)) throw new OddsError('free bet amount must be positive');
  const d = americanToDecimal(freeBetOdds);
  const h = americanToDecimal(hedgeOdds);

  const hedgeStake = (freeBetAmount * (d - 1)) / h;
  const locked = hedgeStake * (h - 1);

  return {
    hedgeStake: money(hedgeStake),
    guaranteedProfit: money(locked),
    conversionPct: Math.round((locked / freeBetAmount) * 10_000) / 100,
    assumptions: [
      'The free bet returns profit only — the stake is not returned.',
      'The hedge is placed with cash at the price shown.',
      'A void or push on either side breaks the lock.',
    ],
  };
}
