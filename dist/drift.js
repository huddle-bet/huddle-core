/**
 * Team drift logging — records upstream team names that failed to resolve
 * to a canonical team ID. Populated from huddle-live discovery and (later)
 * huddle-data scrapers whenever `canonicalEventId()` throws or a team
 * lookup returns null.
 *
 * Design goals:
 *  - Zero runtime dependencies in huddle-core (service injects its own
 *    pg query function)
 *  - Fire-and-forget: DB errors are swallowed and logged to stderr so the
 *    hot discovery path never blocks on drift logging
 *  - Single row per (source_id, sport, raw_team_name) — repeat observations
 *    bump observation_count and last_observed_at
 */
/**
 * Build the SQL and parameter array for an upsert into `team_drift`.
 * Exposed separately so services that already have a query helper can
 * run the write on their own terms (transactions, custom logging, etc.).
 */
export function buildTeamDriftUpsert(entry) {
    const sql = `
    INSERT INTO team_drift (
      service, source_id, sport, raw_team_name, opponent_raw_name, context,
      first_observed_at, last_observed_at, observation_count
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, now(), now(), 1)
    ON CONFLICT (source_id, sport, raw_team_name) DO UPDATE SET
      last_observed_at  = now(),
      observation_count = team_drift.observation_count + 1,
      context           = COALESCE(EXCLUDED.context, team_drift.context),
      opponent_raw_name = COALESCE(EXCLUDED.opponent_raw_name, team_drift.opponent_raw_name),
      service           = EXCLUDED.service
  `;
    const values = [
        entry.service,
        entry.source_id,
        entry.sport,
        entry.raw_team_name,
        entry.opponent_raw_name ?? null,
        entry.context ? JSON.stringify(entry.context) : null,
    ];
    return { sql, values };
}
/**
 * Fire-and-forget wrapper around `buildTeamDriftUpsert`. Logs DB errors
 * to stderr instead of throwing, so callers can `await logTeamDrift(...)`
 * in hot paths without worrying about crashing on a drift-log failure.
 *
 * Example:
 *   await logTeamDrift(
 *     (sql, values) => pool.query(sql, values),
 *     { service: 'huddle-live', source_id: 'gsk', sport: 'cs2', raw_team_name: 'Natus Vincere' }
 *   );
 */
export async function logTeamDrift(query, entry) {
    try {
        const { sql, values } = buildTeamDriftUpsert(entry);
        await query(sql, values);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[team_drift] logTeamDrift failed for ${entry.source_id}:${entry.sport}:${entry.raw_team_name} — ${msg}`);
    }
}
//# sourceMappingURL=drift.js.map