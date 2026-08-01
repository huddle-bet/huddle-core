/**
 * Live-state reducers — folded over EsportsLiveEvent / SportsLiveEvent
 * streams to produce LiveStateRow updates and LiveFeedRow entries.
 *
 * The canonical implementations live here (in @huddle-bet/core) so both
 * huddle-live (real-time ingestion) and huddle-api (the simulate-replay
 * endpoint that walks `live_feed` history through the same reducer) can
 * share the exact same state machine. Reducer drift between the two would
 * silently produce different state for the same input event stream.
 *
 * Sports reducers (NBA/NHL/MLB/NFL) now live here too, ported from huddle-live
 * along with their `common` helpers (ENG-291). They had to be shared for the
 * same reason the esports ones were: huddle-api's simulate endpoint could
 * replay only esports, so NBA and NFL — two of the three launch sports —
 * could not be exercised through the API fanout at all before their seasons.
 *
 * Porting them surfaced exactly the drift this module exists to prevent.
 * `SportsLiveEvent` here was a subset of huddle-live's: no `sync` kind, no
 * `teams`/`situation`, and no scores on `status`. Any consumer reducing a real
 * push event stream against the core type would have silently dropped state the
 * ingestion side depends on. Reconciled to huddle-live's definition, which is
 * the one the reducers were written against.
 */
export * from './types.js';
export * from './esports/cs2.js';
export * from './esports/lol.js';
export * from './esports/dota2.js';
export { reduceVal, createValState } from './esports/valorant.js';
export type { ValGameState } from './esports/valorant.js';
export * from './sports/common.js';
export * from './sports/nba.js';
export * from './sports/nfl.js';
export * from './sports/nhl.js';
export * from './sports/mlb.js';
//# sourceMappingURL=index.d.ts.map