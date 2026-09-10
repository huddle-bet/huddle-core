/**
 * Shared live-ingest row shapes. Written by huddle-live's sport reducers
 * into the `live_state` and `live_feed` tables, read by huddle-api's
 * WebSocket relay and pushed to clients over the internal fanout.
 *
 * Kept as the single source of truth so the three services can't drift.
 */
/**
 * Canonical feed_type values written to `live_feed.feed_type` by huddle-
 * live's reducers and consumed by huddle-api + frontend.
 *
 * Organized by family — additions here are a contract change; coordinate
 * with frontend consumers (hitrate-next/fraggg-next) before shipping new
 * types.
 *
 * `LiveFeedRow.feed_type` remains typed as `string` for backward compat
 * and forward extensibility; reference `FEED_TYPES` / `FeedType` at
 * emission and consumption sites for type-safe checks.
 */
export const FEED_TYPES = {
    // ── Universal ─────────────────────────────────────────────────────────
    GAME_STARTED: 'game_started',
    GAME_ENDED: 'game_ended',
    SCORE_CHANGE: 'score_change',
    PERIOD_ENDED: 'period_ended',
    // ── Sports-only (ESPN, Sportradar) ────────────────────────────────────
    PLAY: 'play',
    // ── Esports series-level (all esports) ────────────────────────────────
    FIXTURE_STARTED: 'fixture_started',
    FIXTURE_ENDED: 'fixture_ended',
    // ── Esports map-level (all esports) ───────────────────────────────────
    MAP_STARTED: 'map_started',
    MAP_ENDED: 'map_ended',
    MAP_VOIDED: 'map_voided',
    MAP_WINNER: 'map_winner',
    // ── Esports round / kill (CS2, Valorant) ──────────────────────────────
    HALF_STARTED: 'half_started',
    ROUND_ENDED: 'round_ended',
    KILL: 'kill',
    BOMB_PLANTED: 'bomb_planted',
    BOMB_EXPLODED: 'bomb_exploded',
    BOMB_DEFUSED: 'bomb_defused',
    // ── Esports objectives (LoL, Dota 2) ──────────────────────────────────
    BARON_SLAIN: 'baron_slain',
    TOWER_DESTROYED: 'tower_destroyed',
    INHIBITOR_DESTROYED: 'inhibitor_destroyed',
};
/** Narrowing helper — returns true if `s` is a known canonical feed_type. */
export function isFeedType(s) {
    return Object.values(FEED_TYPES).includes(s);
}
/**
 * Convert a raw `live_feed` row into the broadcast-facing `FeedEntry` shape.
 *
 * This comment used to say it "replaces the duplicate `adaptFeedRow` / `adaptDbFeedRow`
 * helpers that existed in huddle-live and huddle-api". It does not, and never did. Both
 * still exist and both are the production paths: huddle-live's adapts the rows that go out
 * over the fanout, huddle-api's `adaptDbFeedRow` serves the REST route and the socket's
 * cold-join seed. This copy is reached only by huddle-api's dev simulator.
 *
 * That mattered. `text` read `row.data?.text || ''` in all three. The play translators write
 * `description`; the event translators write `text`; cs2 and mlb happen to write `text`
 * everywhere, so it looked right for years. huddle-api#278 fixed one copy on 2026-09-09
 * (63,178 rows across nfl, nhl and nba rendering as empty cards) and huddle-live#97 fixed the
 * second on 2026-09-10, after nine NFL plays arrived live over ninety seconds with no text.
 * Nobody looked for a third, because this comment said there was not one — so the simulator
 * kept drawing blank NFL cards while production drew the sentence.
 *
 * Unifying the three is the right end state and is deliberately not this change; huddle-api's
 * copy adds `commentCount` and `reactionCounts`, which the fanout cannot fill at broadcast
 * time because the row is not written yet. Until someone measures that, huddle-api's
 * `check:feed-adapter-drift` compares all three and fails on a difference that is not
 * baselined.
 */
export function adaptFeedRow(row) {
    return {
        id: String(row.sort_index),
        playId: row.id != null ? String(row.id) : null,
        ts: row.occurred_at ? new Date(row.occurred_at).getTime() : Date.now(),
        type: row.feed_type,
        text: row.data?.text || row.data?.description || '',
        subtext: row.data?.subtext || null,
        importance: row.importance || 'low',
        mapNumber: row.data?.mapNumber ?? null,
        meta: row.data || {},
        actors: row.data?.actors || [],
        sport: row.league_id,
        fixtureId: row.event_id,
    };
}
//# sourceMappingURL=live.js.map