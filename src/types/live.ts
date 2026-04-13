/**
 * Shared live-ingest row shapes. Written by huddle-live's GSK reducers
 * into the `live_state` and `live_feed` tables, read by huddle-api's
 * WebSocket relay, and broadcast to hitrate-next via Supabase Realtime.
 *
 * Kept as the single source of truth so the three services can't drift.
 */

export interface LiveStateRow {
  event_id: string;
  source_id: string;
  league_id: string;
  status: string;
  period: string | null;
  clock: string | null;
  home_score: number | null;
  away_score: number | null;
  state: Record<string, any>;
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
} as const;

export type FeedType = (typeof FEED_TYPES)[keyof typeof FEED_TYPES];

/** Narrowing helper — returns true if `s` is a known canonical feed_type. */
export function isFeedType(s: string): s is FeedType {
  return (Object.values(FEED_TYPES) as string[]).includes(s);
}

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
export function adaptFeedRow(row: LiveFeedRow): FeedEntry {
  return {
    id: String(row.sort_index),
    ts: row.occurred_at ? new Date(row.occurred_at).getTime() : Date.now(),
    type: row.feed_type,
    text: row.data?.text || '',
    subtext: row.data?.subtext || null,
    importance: row.importance || 'low',
    mapNumber: row.data?.mapNumber ?? null,
    meta: row.data || {},
    actors: row.data?.actors || [],
    sport: row.league_id,
    fixtureId: row.event_id,
  };
}
