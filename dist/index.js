// Types
export * from './types/index.js';
// Identity
export * from './ids/index.js';
export * from './errors.js';
export { ALL_TEAMS, NBA_TEAMS, NFL_TEAMS, NHL_TEAMS, MLB_TEAMS, ESPORTS_TEAMS, CS2_TEAMS, VALORANT_TEAMS, LOL_TEAMS, DOTA2_TEAMS, COD_TEAMS, RL_TEAMS, } from './ids/data/index.js';
// Matchers
export * from './matchers/index.js';
// Canonical IDs & Realtime channels
export * from './canonical.js';
// Team drift logging
export * from './drift.js';
// Upstream-enum drift guard
export * from './unknown-variant.js';
// Provider routing config (primary + fallback per league)
export * from './config/leagues.js';
export * from './config/registry.js';
export * from './sportradar/player-stats.js';
export * from './sportradar/nfl-player-stats.js';
// Sportradar status → EventStatus. Shared because it was duplicated nine times across
// huddle-data and huddle-live, and every copy carried the same two bugs (ENG-521).
export * from './sportradar/game-status.js';
// Per-sport curated allowlists (pro leagues we ingest).
export * from './config/dota2-leagues.js';
// Shared lolesports (Riot) public API key + self-harvest.
export * from './config/lolesports-api.js';
// Esports live-state reducers (cs2, lol, dota2, valorant). Shared
// between huddle-live's real-time ingestion and huddle-api's simulate
// endpoint — both fold the same EsportsLiveEvent stream through the
// same reducer to keep state-machine behavior identical.
export * from './reducers/index.js';
// Residential proxy pool, resolved from Webshare at runtime (ENG-668).
export * from './proxy/pool.js';
// Betting arithmetic — odds conversion, devig, EV, Kelly, and the interactive
// calculators. Pure functions over supplied numbers, so they belong in every consumer
// rather than behind an HTTP endpoint: the client computes a parlay payout without a
// round trip, and huddle-api serves the engine's output instead of arithmetic.
//
// `parseAmericanOdds` is the string path. huddle-engine holds two private copies of that
// conversion which return 1.91 on a parse failure — 83 ev_opportunities rows carry a
// payout-tier word in the price column and are silently sized as -110 (ENG-601).
export * from './betting/odds.js';
export * from './betting/calculators.js';
export * from './betting/win-probability.js';
export * from './betting/parlay-correlation.js';
//# sourceMappingURL=index.js.map