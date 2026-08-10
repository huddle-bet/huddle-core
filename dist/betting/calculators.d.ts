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
export declare function parlay(legs: ParlayLeg[], stake: number): ParlayResult;
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
export declare function hedge(originalStake: number, originalOdds: number, hedgeOdds: number): HedgeResult;
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
    stakes: Array<{
        book?: string;
        stake: number;
        returns: number;
    }>;
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
export declare function arbitrage(legs: ArbitrageLeg[], totalStake: number): ArbitrageResult;
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
export declare function freeBetConversion(freeBetAmount: number, freeBetOdds: number, hedgeOdds: number): FreeBetResult;
//# sourceMappingURL=calculators.d.ts.map