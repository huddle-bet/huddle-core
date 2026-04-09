/**
 * Shared live-ingest row shapes. Written by huddle-live's GSK reducers
 * into the `live_state` and `live_feed` tables, read by huddle-api's
 * WebSocket relay, and broadcast to hitrate-next via Supabase Realtime.
 *
 * Kept as the single source of truth so the three services can't drift.
 */
/**
 * Convert a raw `live_feed` row into the broadcast-facing `FeedEntry`
 * shape. This replaces the duplicate `adaptFeedRow` / `adaptDbFeedRow`
 * helpers that existed in huddle-live and huddle-api.
 */
export function adaptFeedRow(row) {
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
//# sourceMappingURL=live.js.map