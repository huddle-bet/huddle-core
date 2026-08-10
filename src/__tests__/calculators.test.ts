import { describe, it, expect } from 'vitest';
import {
  americanToDecimal, decimalToAmerican, impliedProbability, devig, vig,
  expectedValue, kellyFraction, OddsError,
} from '../betting/odds.js';
import { parlay, hedge, arbitrage, freeBetConversion } from '../betting/calculators.js';
import { parseAmericanOdds, decimalFromAmericanString } from '../betting/odds.js';

/**
 * Every expected value here is worked out by hand from the arithmetic, not read back
 * from an earlier run. A test that records what the code currently does will happily
 * lock in a wrong answer — and this is money arithmetic, so a wrong answer is the kind
 * someone acts on.
 *
 * Fully deterministic: no database, no network, no clock.
 */

describe('odds conversion', () => {
  it.each([
    [-110, 1 + 100 / 110],
    [-200, 1.5],
    [100, 2],
    [150, 2.5],
    [200, 3],
  ])('American %i is decimal %f', (american, decimal) => {
    expect(americanToDecimal(american)).toBeCloseTo(decimal, 10);
  });

  it('round-trips through decimal', () => {
    for (const a of [-500, -250, -110, 100, 150, 300, 1200]) {
      expect(decimalToAmerican(americanToDecimal(a))).toBe(a);
    }
  });

  // There is no price between -100 and +100: a side cannot pay less than even money.
  // Rounding into the gap would silently turn a caller's typo into a plausible number.
  it.each([-99, 0, 50, 99])('refuses %i, which is not a real American price', (bad) => {
    expect(() => americanToDecimal(bad)).toThrow(OddsError);
  });

  it('rejects decimal odds of 1 or less', () => {
    expect(() => decimalToAmerican(1)).toThrow(OddsError);
    expect(() => impliedProbability(0.5)).toThrow(OddsError);
  });
});

describe('vig', () => {
  // -110 both ways: each side implies 1/1.9091 = 0.5238, summing to 1.0476.
  const bothWays = [americanToDecimal(-110), americanToDecimal(-110)];

  it('measures the overround on a standard two-way market', () => {
    expect(vig(bothWays)).toBeCloseTo(0.0476, 4);
  });

  it('normalises a market to probabilities summing to one', () => {
    const fair = devig(bothWays);
    expect(fair[0] + fair[1]).toBeCloseTo(1, 10);
    // Symmetric prices devig to a coin flip.
    expect(fair[0]).toBeCloseTo(0.5, 10);
  });

  it('splits an asymmetric market proportionally', () => {
    // -200 implies 0.6667, +150 implies 0.4. Total 1.0667.
    const fair = devig([americanToDecimal(-200), americanToDecimal(150)]);
    expect(fair[0]).toBeCloseTo(0.6667 / 1.0667, 3);
    expect(fair[0] + fair[1]).toBeCloseTo(1, 10);
  });

  it('needs two prices to have anything to normalise against', () => {
    expect(() => devig([2.0])).toThrow(OddsError);
  });
});

describe('expected value and Kelly', () => {
  it('is zero when the price exactly matches the probability', () => {
    // A true coin flip priced at +100 is break-even.
    expect(expectedValue(0.5, 2.0)).toBeCloseTo(0, 10);
  });

  it('is positive when the price is better than the probability deserves', () => {
    // 55% at even money: 0.55 × 1 − 0.45 = 0.10 per unit.
    expect(expectedValue(0.55, 2.0)).toBeCloseTo(0.1, 10);
  });

  it('stakes nothing on a negative edge', () => {
    // Kelly goes negative here, which means do not bet — not bet the other way.
    expect(kellyFraction(0.4, 2.0)).toBe(0);
  });

  it('is a quarter of full Kelly by default', () => {
    // Full Kelly at p=0.55, b=1 is (0.55·1 − 0.45)/1 = 0.10. A quarter is 0.025.
    expect(kellyFraction(0.55, 2.0)).toBeCloseTo(0.025, 10);
    expect(kellyFraction(0.55, 2.0, 1)).toBeCloseTo(0.1, 10);
  });
});

describe('parlay', () => {
  it('multiplies decimal odds', () => {
    // Two even-money legs: 2.0 × 2.0 = 4.0, which is +300.
    const r = parlay([{ odds: 100 }, { odds: 100 }], 100);
    expect(r.decimal).toBe(4);
    expect(r.american).toBe(300);
    expect(r.payout).toBe(400);
    expect(r.profit).toBe(300);
    expect(r.impliedProbability).toBeCloseTo(0.25, 4);
  });

  // The bug this replaced: vig was "removed" by constructing the opposite side as the
  // exact complement of the quoted price, which always sums to 1, so the normalisation
  // did nothing and hold came out 0.00% on every parlay.
  it('reports no fair probability when the other side was not supplied', () => {
    const r = parlay([{ odds: -110 }, { odds: -110 }], 100);
    expect(r.fairProbability).toBeNull();
    expect(r.holdPct).toBeNull();
    expect(r.assumptions.some((a) => a.includes('Vig is not removed'))).toBe(true);
  });

  it('devigs when every leg brings its opposite, and finds a non-zero hold', () => {
    const r = parlay(
      [{ odds: -110, oppositeOdds: -110 }, { odds: -110, oppositeOdds: -110 }],
      100,
    );
    // Each leg devigs to 0.5, so the fair parlay is 0.25.
    expect(r.fairProbability).toBeCloseTo(0.25, 4);
    // Implied is 0.5238² = 0.2744 against a fair 0.25 — the book keeps about 9.8%,
    // roughly double the 4.76% it holds on one leg. That compounding is the point.
    expect(r.impliedProbability).toBeCloseTo(0.2744, 4);
    expect(r.holdPct).toBeGreaterThan(9);
    expect(r.holdPct).toBeLessThan(10);
  });

  it('refuses a single leg and an absurd number of them', () => {
    expect(() => parlay([{ odds: 100 }], 10)).toThrow(OddsError);
    expect(() => parlay(Array(16).fill({ odds: 100 }), 10)).toThrow(OddsError);
  });
});

describe('hedge', () => {
  it('levels the two outcomes', () => {
    // $100 at +200 (decimal 3), hedged at +100 (decimal 2).
    // X = 100·3/2 = 150. Either way: 300 − 100 − 150 = 50.
    const r = hedge(100, 200, 100);
    expect(r.hedgeStake).toBe(150);
    expect(r.profitIfOriginalWins).toBe(50);
    expect(r.profitIfHedgeWins).toBe(50);
    expect(r.guaranteedProfit).toBe(50);
    expect(r.guaranteedLoss).toBe(false);
  });

  it('locks nothing when both sides are even money', () => {
    const r = hedge(100, 100, 100);
    expect(r.hedgeStake).toBe(100);
    expect(r.guaranteedProfit).toBe(0);
  });

  // Hedging a position that has moved against you costs money. That is the answer, and
  // suppressing it would hide the decision the user is actually making.
  it('reports a guaranteed loss rather than hiding it', () => {
    const r = hedge(100, -200, -200);
    expect(r.guaranteedLoss).toBe(true);
    expect(r.guaranteedProfit).toBeLessThan(0);
  });
});

describe('arbitrage', () => {
  it('finds one and pays the same whichever way it lands', () => {
    // +110 implies 0.4762, -100 implies 0.5. Total 0.9762 — an arbitrage.
    const r = arbitrage([{ odds: 110, book: 'a' }, { odds: 100, book: 'b' }], 1000);
    expect(r.exists).toBe(true);
    expect(r.totalImplied).toBeCloseTo(0.9762, 4);
    expect(r.profitPct).toBeCloseTo(2.44, 1);
    // The whole point: identical return on both outcomes.
    expect(r.stakes[0].returns).toBeCloseTo(r.stakes[1].returns, 1);
    expect(r.stakes[0].stake + r.stakes[1].stake).toBeCloseTo(1000, 1);
  });

  it('reports a near miss with its real numbers instead of refusing', () => {
    // The standard -110 both ways: 1.0476, no arbitrage.
    const r = arbitrage([{ odds: -110 }, { odds: -110 }], 1000);
    expect(r.exists).toBe(false);
    expect(r.totalImplied).toBeCloseTo(1.0476, 4);
    expect(r.profitPct).toBeLessThan(0);
  });
});

describe('free bet conversion', () => {
  it('values a stake-not-returned free bet at what it actually locks', () => {
    // $100 free bet at +200 (decimal 3) returns 100 × 2 = 200 profit, not 300.
    // Hedged at -250 (decimal 1.4): X = 100·2/1.4 = 142.857, locking 142.857 × 0.4.
    const r = freeBetConversion(100, 200, -250);
    expect(r.hedgeStake).toBeCloseTo(142.86, 2);
    expect(r.guaranteedProfit).toBeCloseTo(57.14, 2);
    expect(r.conversionPct).toBeCloseTo(57.14, 1);
  });

  it('converts better at longer odds', () => {
    // The reason bettors lay free bets off on longshots: only the profit is kept, so a
    // bigger multiplier on the same stake keeps more of it.
    const short = freeBetConversion(100, 100, -110).conversionPct;
    const long = freeBetConversion(100, 400, -450).conversionPct;
    expect(long).toBeGreaterThan(short);
  });

  it('rejects a non-positive amount', () => {
    expect(() => freeBetConversion(0, 200, -250)).toThrow(OddsError);
  });
});

/**
 * The string path — ENG-601's downstream half.
 *
 * huddle-engine carries two private copies of this conversion and both answer 1.91 when
 * they cannot parse, so a payout-tier word in a price column becomes a -110 bet that
 * Kelly sizes and the ROI tracker records. These pin the opposite behaviour.
 */
describe('parseAmericanOdds refuses rather than inventing a price', () => {
  it('reads ordinary prices, with or without a sign', () => {
    expect(parseAmericanOdds('-110')).toBe(-110);
    expect(parseAmericanOdds('+150')).toBe(150);
    expect(parseAmericanOdds('150')).toBe(150);
  });

  it('folds the unicode minus books actually emit', () => {
    // U+2212 and U+2013. 47 rows in ev_opportunities carried these on 2026-08-10.
    expect(parseAmericanOdds('−105')).toBe(-105);
    expect(parseAmericanOdds('–120')).toBe(-120);
  });

  it('returns null for the payout-tier words found in the price column', () => {
    // The 83 rows. Each of these is currently sized as -110 by huddle-engine.
    expect(parseAmericanOdds('boosted')).toBeNull();
    expect(parseAmericanOdds('reduced')).toBeNull();
    expect(parseAmericanOdds('standard')).toBeNull();
  });

  it('returns null rather than a default for empty and absent input', () => {
    expect(parseAmericanOdds('')).toBeNull();
    expect(parseAmericanOdds(null)).toBeNull();
    expect(parseAmericanOdds(undefined)).toBeNull();
  });

  it('refuses a value no book can quote', () => {
    // -110 is a price; -50 is a misread. The engine's copies return 1.5 for this.
    expect(parseAmericanOdds('-50')).toBeNull();
    expect(parseAmericanOdds('0')).toBeNull();
  });

  it('composes into decimal, still refusing', () => {
    expect(decimalFromAmericanString('+100')).toBe(2);
    expect(decimalFromAmericanString('reduced')).toBeNull();
  });
});
