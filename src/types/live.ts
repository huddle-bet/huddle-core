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
