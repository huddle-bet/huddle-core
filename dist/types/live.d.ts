/**
 * Shared live-ingest row shapes. Written by huddle-live's GSK reducers
 * into the `live_state` and `live_feed` tables, read by huddle-api's
 * WebSocket relay, and broadcast to hitrate-next via Supabase Realtime.
 *
 * Kept as the single source of truth so the three services can't drift.
 */
/**
 * JSONB blob written to `live_state.state`. Loosely typed at this layer
 * because each sport carries a different inner `gameState` shape (NBA's
 * periodLabel/quarter, CS2's round history + per-player stats, LoL's
 * objectives, etc.). The concrete per-sport shapes live in huddle-live's
 * reducers (reducers/sports/common.ts for traditional, reducers/esports/*
 * for esports). Consumers should narrow on `league_id` before reading
 * sport-specific fields.
 */
export interface LiveStateBlob {
    /** Per-sport game state — shape depends on `LiveStateRow.league_id`. */
    gameState?: unknown;
    /** Set by provider adapters to signal feed completeness ('full' = WS
     *  stream, 'partial' = REST poll). Consumed by huddle-api. */
    coverage?: 'full' | 'partial';
    /** Additional provider-specific fields — esports reducers stash
     *  seriesScore / teams / winnerId here; sports reducers are flatter. */
    [key: string]: unknown;
}
export interface LiveStateRow {
    event_id: string;
    source_id: string;
    league_id: string;
    status: string;
    period: string | null;
    clock: string | null;
    home_score: number | null;
    away_score: number | null;
    state: LiveStateBlob;
    sort_index: number;
}
export interface LiveFeedRow {
    event_id: string;
    source_id: string;
    league_id: string;
    sort_index: number;
    feed_type: string;
    importance: FeedImportance;
    occurred_at: string | null;
    data: Record<string, any>;
}
export type FeedImportance = 'low' | 'medium' | 'high' | 'critical';
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
export declare const FEED_TYPES: {
    readonly GAME_STARTED: "game_started";
    readonly GAME_ENDED: "game_ended";
    readonly SCORE_CHANGE: "score_change";
    readonly PERIOD_ENDED: "period_ended";
    readonly PLAY: "play";
    readonly FIXTURE_STARTED: "fixture_started";
    readonly FIXTURE_ENDED: "fixture_ended";
    readonly MAP_STARTED: "map_started";
    readonly MAP_ENDED: "map_ended";
    readonly MAP_VOIDED: "map_voided";
    readonly MAP_WINNER: "map_winner";
    readonly HALF_STARTED: "half_started";
    readonly ROUND_ENDED: "round_ended";
    readonly KILL: "kill";
    readonly BOMB_PLANTED: "bomb_planted";
    readonly BOMB_EXPLODED: "bomb_exploded";
    readonly BOMB_DEFUSED: "bomb_defused";
    readonly BARON_SLAIN: "baron_slain";
    readonly TOWER_DESTROYED: "tower_destroyed";
    readonly INHIBITOR_DESTROYED: "inhibitor_destroyed";
};
export type FeedType = (typeof FEED_TYPES)[keyof typeof FEED_TYPES];
/** Narrowing helper — returns true if `s` is a known canonical feed_type. */
export declare function isFeedType(s: string): s is FeedType;
/**
 * Broadcast-facing feed entry. This is the shape the frontend
 * (hitrate-next useMatchWebSocket) consumes, and what huddle-api's
 * hybrid WS relay sends on `state_update` / `snapshot` messages.
 */
export interface FeedEntry {
    id: string;
    ts: number;
    type: string;
    text: string;
    subtext: string | null;
    actors: string[];
    meta: Record<string, any>;
    importance: FeedImportance;
    fixtureId: string;
    mapNumber: number | null;
    sport: string;
}
/**
 * Convert a raw `live_feed` row into the broadcast-facing `FeedEntry`
 * shape. This replaces the duplicate `adaptFeedRow` / `adaptDbFeedRow`
 * helpers that existed in huddle-live and huddle-api.
 */
export declare function adaptFeedRow(row: LiveFeedRow): FeedEntry;
//# sourceMappingURL=live.d.ts.map