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
export interface TeamDriftEntry {
    /** Which service observed the miss. */
    service: string;
    /** The upstream source that produced the unresolvable team. */
    source_id: string;
    /** Sport slug — should match `events.league_id`. */
    sport: string;
    /** Exactly what the upstream source sent us. */
    raw_team_name: string;
    /** The other team in the fixture, for context. */
    opponent_raw_name?: string | null;
    /** Arbitrary metadata useful for debugging (fixtureId, startTime, URL...). */
    context?: Record<string, any> | null;
}
/**
 * A minimal pg-compatible query function. Services pass something like
 * `(sql, values) => pool.query(sql, values)` from their existing pg pool.
 * The return value is ignored — this helper only cares about throws.
 */
export type TeamDriftQueryFn = (sql: string, values: any[]) => Promise<unknown>;
/**
 * Build the SQL and parameter array for an upsert into `team_drift`.
 * Exposed separately so services that already have a query helper can
 * run the write on their own terms (transactions, custom logging, etc.).
 */
export declare function buildTeamDriftUpsert(entry: TeamDriftEntry): {
    sql: string;
    values: unknown[];
};
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
export declare function logTeamDrift(query: TeamDriftQueryFn, entry: TeamDriftEntry): Promise<void>;
//# sourceMappingURL=drift.d.ts.map