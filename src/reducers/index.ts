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
 * Sports reducers (NBA/NHL/MLB/NFL/NCAA) currently live only in
 * huddle-live; they pull from a richer common helpers module that
 * isn't ported yet. Esports reducers are self-contained — only depend
 * on the LiveStateRow shape — so they're the natural first export.
 */
export * from './types.js';
export * from './esports/cs2.js';
export * from './esports/lol.js';
export * from './esports/dota2.js';
// valorant.ts re-exports CS2 types; export it last so the named exports
// don't shadow each other.
export { reduceVal, createValState } from './esports/valorant.js';
export type { ValGameState } from './esports/valorant.js';
