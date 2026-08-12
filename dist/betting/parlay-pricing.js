/**
 * Parlay pricing orchestration — ENG-295 (moved from huddle-engine with the
 * math beneath it; huddle-engine re-exports from src/engine/parlay/index.ts).
 *
 * priceParlay() is the whole public surface: legs in, price + correlation
 * signal out. It owns leg validation, pairwise dependence and the joint
 * probability; it deliberately does NOT own marginal win probabilities —
 * those come from the injected deps, backed by the same probOver / Monte
 * Carlo machinery the EV detector runs, so the exactly-one-owner rule that
 * ENG-722 established for adjustments holds for probabilities too.
 *
 * Approved defaults (Cam, 2026-08-12, on the issue): correlation is
 * empirical-with-prior-shrinkage over shared-game history, and the fair
 * combined odds are OUR number — the payout is the product of the books' leg
 * prices, and the gap between the two is the point of the tool.
 */
import { oddsToDecimalPayout } from './win-probability.js';
import { correlationSignal, effectiveCorrelation, jointHitProbability, priorFor, shrunkCorrelation, } from './parlay-correlation.js';
export class ParlayValidationError extends Error {
    rejections;
    constructor(rejections) {
        super(rejections.map((r) => `${r.leg.player} ${r.leg.statType} ${r.leg.side} ${r.leg.line} @ ${r.leg.source}: ${r.reason}`).join('; '));
        this.rejections = rejections;
        this.name = 'ParlayValidationError';
    }
}
export function relationOf(a, b) {
    if (a.canonicalEventId !== b.canonicalEventId)
        return 'cross-game';
    if (a.player === b.player)
        return 'same-player';
    if (a.teamId && b.teamId)
        return a.teamId === b.teamId ? 'same-team' : 'opponents';
    return 'same-game-other';
}
/** Stable seed from the parlay's own identity — two workers agree. */
function parlaySeed(legs) {
    let h = 2166136261 >>> 0;
    const mix = (s) => {
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
    };
    for (const l of [...legs].sort((x, y) => (x.player + x.statType).localeCompare(y.player + y.statType))) {
        mix(`${l.canonicalEventId}|${l.player}|${l.statType}|${l.side}|${l.line}|${l.source}`);
    }
    return h;
}
export async function priceParlay(legs, deps) {
    if (legs.length < 2) {
        throw new ParlayValidationError(legs.map((leg) => ({ leg, reason: 'a parlay needs at least two legs' })));
    }
    // Validation: every leg must have a live offer at its own line and book,
    // and a marginal the model can stand behind. Rejections carry reasons —
    // a stale leg is a stated fact, never a silent reprice (ENG-300's rule).
    const rejections = [];
    const enriched = [];
    for (const leg of legs) {
        const offer = await deps.findLiveOffer(leg);
        if (!offer) {
            rejections.push({ leg, reason: 'no live offer at this line and book — the leg is stale' });
            continue;
        }
        const decimal = oddsToDecimalPayout(offer.oddsAmerican);
        if (decimal == null) {
            rejections.push({ leg, reason: `unparseable odds "${offer.oddsAmerican}"` });
            continue;
        }
        const p = await deps.marginalProb(leg);
        if (p == null || p <= 0 || p >= 1) {
            rejections.push({ leg, reason: 'no model probability for this player/stat' });
            continue;
        }
        enriched.push({ ...leg, oddsAmerican: offer.oddsAmerican, decimal: decimal + 1, marginalProb: p });
    }
    if (rejections.length > 0)
        throw new ParlayValidationError(rejections);
    // Pairwise dependence. Cross-game pairs skip the history fetch entirely —
    // their prior is 0 by construction and history would only add noise.
    const n = enriched.length;
    const corr = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    const pairs = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const a = enriched[i], b = enriched[j];
            const relation = relationOf(a, b);
            const prior = priorFor(relation, a.statType, b.statType);
            const paired = relation === 'cross-game' ? null : await deps.pairedHistory(a, b);
            const { r, source } = shrunkCorrelation(paired, prior);
            const effective = effectiveCorrelation(r, a.side, b.side);
            corr[i][j] = effective;
            corr[j][i] = effective;
            pairs.push({ a: i, b: j, r: Math.round(r * 1000) / 1000, effective: Math.round(effective * 1000) / 1000, source });
        }
    }
    const marginals = enriched.map((l) => l.marginalProb);
    const naiveProb = marginals.reduce((p, m) => p * m, 1);
    const trueParlayProb = jointHitProbability(marginals, corr, parlaySeed(legs));
    const payoutDecimal = enriched.reduce((p, l) => p * l.decimal, 1);
    const signal = correlationSignal(pairs.map((p) => p.effective));
    return {
        legs: enriched,
        payout: { decimal: Math.round(payoutDecimal * 100) / 100, toWinPer1: Math.round((payoutDecimal - 1) * 100) / 100 },
        trueParlayProb: Math.round(trueParlayProb * 10000) / 10000,
        naiveProb: Math.round(naiveProb * 10000) / 10000,
        fair: { decimal: trueParlayProb > 0 ? Math.round((1 / trueParlayProb) * 100) / 100 : Infinity },
        ev: Math.round((trueParlayProb * payoutDecimal - 1) * 10000) / 10000,
        correlation: { ...signal, pairs },
    };
}
//# sourceMappingURL=parlay-pricing.js.map