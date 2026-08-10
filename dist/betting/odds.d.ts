/**
 * Odds conversion and vig removal.
 *
 * Every calculator in this domain works in decimal odds internally and converts at the
 * edges. American odds are what books display and what the rest of the system stores as
 * text, but they are discontinuous around zero and awkward to multiply — a parlay is a
 * product of decimals and nothing else.
 *
 * Nothing here touches the database. These are the request-answering half of the Betting
 * Tools work: given numbers the user supplies, return numbers. The batch scanners that
 * sweep the whole market live in huddle-engine, per `domains/tools/README.md`.
 */
/** A price the caller gave us that cannot be interpreted. */
export declare class OddsError extends Error {
    constructor(message: string);
}
/**
 * American to decimal.
 *
 * `-110` becomes 1.909…, `+150` becomes 2.5. American odds have no value between -100
 * and +100 — a price cannot pay less than even money on either side — so anything in
 * that gap is a caller mistake rather than a number to round.
 */
export declare function americanToDecimal(american: number): number;
/** Decimal to American, rounded to the nearest whole number as books quote it. */
export declare function decimalToAmerican(decimal: number): number;
/**
 * The probability a price implies, vig included.
 *
 * This is not the book's estimate of the outcome — it is that estimate plus their
 * margin. Across a two-way market these sum to more than 1, and the excess is the vig.
 * Use `devig` before treating any of this as a probability.
 */
export declare function impliedProbability(decimal: number): number;
/**
 * Strip the vig from a set of prices covering one market.
 *
 * Multiplicative normalisation: divide each implied probability by their sum. It assumes
 * the book spreads its margin proportionally, which is the standard simplification and
 * is close enough on two-way markets. It is *not* close on long lists of longshots,
 * where books load more margin onto the tail — a three-way or futures market devigged
 * this way overstates the favourite.
 *
 * Returns probabilities summing to 1, in the order given.
 */
export declare function devig(decimals: number[]): number[];
/** The book's margin on a market, as a fraction. 0.045 is a standard -110 two-way hold. */
export declare function vig(decimals: number[]): number;
/**
 * Expected value per unit staked, given a true probability and a price.
 *
 * Positive means the price is better than the probability deserves. Expressed per unit
 * rather than per bet so it composes with any stake.
 */
export declare function expectedValue(trueProbability: number, decimal: number): number;
/**
 * Fractional Kelly stake, as a fraction of bankroll.
 *
 * Full Kelly maximises long-run growth and is far too volatile to actually bet — a
 * quarter is the usual practical choice, and it is what the engine already records in
 * `ev_opportunities.kelly_units`. Clamped at zero: Kelly goes negative on a bad price,
 * which means "do not bet", not "bet the other side" — that would be a different price
 * with its own vig.
 */
export declare function kellyFraction(trueProbability: number, decimal: number, multiplier?: number): number;
/** Round money to cents, avoiding the float dust that makes a UI show 24.999999999. */
export declare function money(value: number): number;
/**
 * Parse a book's American price string, or say that you cannot.
 *
 * `americanToDecimal` above takes a number and throws on anything that is not a price.
 * That is right for a calculator whose input came from a form. It is not usable against
 * `odds_current.odds_american` or `ev_opportunities.best_odds`, which are text columns
 * carrying whatever the book sent.
 *
 * Two private copies of this already exist in huddle-engine — `engine/kelly.ts:111` and
 * `tracking/roi-tracker.ts:218`, byte-identical to each other — and both **return 1.91 on
 * a parse failure**, silently substituting -110 for a price they could not read.
 *
 * Measured against `ev_opportunities` on 2026-08-10: **83 of 2,205 rows** carry
 * `boosted`, `reduced` or `standard` — payout-tier words in a price column, the ENG-601
 * shape. Every one of those is currently sized and tracked as if the book had offered
 * -110. The number is plausible, nothing raises, and the fabrication is invisible.
 *
 * So this returns `null` rather than throwing or guessing. A caller that wants to skip
 * the row can; a caller that wants to 400 can; a caller that genuinely wants -110 has to
 * write `?? 1.91` and own it. **What none of them can do any more is get a fabricated
 * price without asking for one.**
 *
 * The cleaning is kept from the engine's copies and is not cosmetic: books emit U+2212
 * MINUS SIGN and U+2013 EN DASH where ASCII `-` belongs, and 47 rows in that same
 * measurement did.
 */
export declare function parseAmericanOdds(raw: string | null | undefined): number | null;
/** `parseAmericanOdds` composed with `americanToDecimal`. Null when the price is unreadable. */
export declare function decimalFromAmericanString(raw: string | null | undefined): number | null;
//# sourceMappingURL=odds.d.ts.map