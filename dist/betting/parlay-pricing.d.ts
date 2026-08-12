import { type LegSide, type PairRelation } from './parlay-correlation.js';
export interface ParlayLegInput {
    canonicalEventId: string;
    leagueId: string;
    player: string;
    statType: string;
    side: LegSide;
    line: number;
    /** The book quoting this leg. */
    source: string;
    /** Same-side identity for relation detection: the player's club. */
    teamId?: string;
}
/** What the engine needs from the outside world, injectable for tests. */
export interface ParlayDeps {
    /**
     * A live offer for the leg at its own book and line, or null — the same
     * predicate output:pickOffers asserts. Returning the American price lets
     * the payout use the book's own number.
     */
    findLiveOffer(leg: ParlayLegInput): Promise<{
        oddsAmerican: string;
    } | null>;
    /** Marginal P(leg hits), from the EV machinery's owner functions. */
    marginalProb(leg: ParlayLegInput): Promise<number | null>;
    /**
     * Paired same-game history for two legs' (player, stat) series, aligned by
     * shared event — or null when either side has none.
     */
    pairedHistory(a: ParlayLegInput, b: ParlayLegInput): Promise<{
        a: number[];
        b: number[];
    } | null>;
}
export interface PricedParlay {
    legs: Array<ParlayLegInput & {
        oddsAmerican: string;
        decimal: number;
        marginalProb: number;
    }>;
    /** Product of the legs' book prices — what the ticket would pay. */
    payout: {
        decimal: number;
        toWinPer1: number;
    };
    /** Our number: the copula probability and its fair price. */
    trueParlayProb: number;
    naiveProb: number;
    fair: {
        decimal: number;
    };
    /** trueParlayProb × payout.decimal − 1: the EV of the ticket as priced. */
    ev: number;
    correlation: {
        score: number;
        label: 'boosts' | 'independent' | 'fights';
        pairs: Array<{
            a: number;
            b: number;
            r: number;
            effective: number;
            source: string;
        }>;
    };
}
export declare class ParlayValidationError extends Error {
    readonly rejections: Array<{
        leg: ParlayLegInput;
        reason: string;
    }>;
    constructor(rejections: Array<{
        leg: ParlayLegInput;
        reason: string;
    }>);
}
export declare function relationOf(a: ParlayLegInput, b: ParlayLegInput): PairRelation;
export declare function priceParlay(legs: ParlayLegInput[], deps: ParlayDeps): Promise<PricedParlay>;
//# sourceMappingURL=parlay-pricing.d.ts.map