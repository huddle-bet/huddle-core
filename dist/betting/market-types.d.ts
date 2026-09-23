/**
 * Canonical market type normalization — THE one stat vocabulary.
 *
 * Moved here from huddle-odds (`src/market-types.ts`) for ENG-1076, unchanged, so that synced bets
 * and odds speak the same stat keys. Before this, huddle-odds mapped every book's market names onto
 * canonical types and huddle-api stored each book's bet legs under the book's own words — `Rec
 * Yards` from PrizePicks, `Receiving Yards` from Underdog, `Travis Kelce Receptions O/U` from
 * DraftKings — with nothing joining them. Two copies of this map would drift the way every other
 * duplicated constant in this workspace has; one copy in core cannot.
 *
 * Each book's client extracts the raw stat name from its own format, then calls
 * normalizeMarketType() to get the canonical form.
 */
export declare const MARKET_TYPE_MAP: Record<string, string>;
/**
 * Normalize a market type string to its canonical form.
 * Handles all book formats: raw stat names, FanDuel's player_X_total_ prefix, etc.
 */
export declare function normalizeMarketType(type: string): string;
/**
 * Check if a market type is one we track (game lines + standard player props).
 * Returns false for exotic/noisy markets that inflate the DB without value.
 *
 * A segment-scoped type is useful exactly when the stat it scopes is useful — otherwise
 * every client that scopes a market would silently have it dropped by this filter, which
 * is how BetMGM's MLB props produced one stored row.
 */
export declare function isUsefulMarket(type: string): boolean;
//# sourceMappingURL=market-types.d.ts.map