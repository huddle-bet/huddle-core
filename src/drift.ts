/**
 * Drift logging — records upstream identities that didn't cleanly resolve
 * to canonical entities. Populates two tables:
 *
 *   `team_drift`   — huddle-live's ensureEvent() writes here when a team
 *                    name can't be matched via TeamRegistry. The events
 *                    row is REJECTED in that case (hard drift).
 *
 *   `player_drift` — huddle-data's resolveOrCreatePlayer() writes here
 *                    when both external ID and name lookups miss, right
 *                    before the auto-create path fires. The player row
 *                    is STILL created (soft drift) — the log entry is a
 *                    triage surface for humans to review whether the
 *                    auto-created player is a duplicate of an existing
 *                    canonical player.
 *
 * Design goals:
 *  - Zero runtime dependencies in huddle-core (service injects its own
 *    pg query function)
 *  - Fire-and-forget: DB errors are swallowed and logged to stderr so
 *    the hot write paths never block on drift logging
 *  - Single row per (source_id, sport, raw_name) — repeat observations
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
export function buildTeamDriftUpsert(entry: TeamDriftEntry): {
  sql: string;
  values: unknown[];
} {
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
  const values: unknown[] = [
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
export async function logTeamDrift(
  query: TeamDriftQueryFn,
  entry: TeamDriftEntry,
): Promise<void> {
  try {
    const { sql, values } = buildTeamDriftUpsert(entry);
    await query(sql, values);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[team_drift] logTeamDrift failed for ${entry.source_id}:${entry.sport}:${entry.raw_team_name} — ${msg}`,
    );
  }
}

// ─── Player drift ────────────────────────────────────────────────────────────

export interface PlayerDriftEntry {
  /** Which service observed the miss. */
  service: string;
  /** The upstream source that produced the unresolvable player. */
  source_id: string;
  /** Sport slug — should match `events.league_id`. */
  sport: string;
  /** Exactly what the upstream source sent us. */
  raw_player_name: string;
  /**
   * The UUID that `resolveOrCreatePlayer()` generated when both lookups
   * missed. Stored so operators can trace the drift row back to the
   * actual player record and merge duplicates if needed.
   */
  auto_created_player_id?: string | null;
  /** Team the player was on at the time of the miss, for context. */
  team_raw_name?: string | null;
  /**
   * External IDs the scraper tried to resolve against before falling
   * through — e.g. `[{source: 'bo3gg', id: '12345'}]`.
   */
  external_ids?: Array<{ source: string; id: string }> | null;
  /** Arbitrary metadata (matchId, tournament, startTime, URL...). */
  context?: Record<string, any> | null;
}

/** Alias of TeamDriftQueryFn — same signature, any pg-compatible query fn. */
export type PlayerDriftQueryFn = TeamDriftQueryFn;

export function buildPlayerDriftUpsert(entry: PlayerDriftEntry): {
  sql: string;
  values: unknown[];
} {
  const sql = `
    INSERT INTO player_drift (
      service, source_id, sport, raw_player_name,
      auto_created_player_id, team_raw_name, external_ids, context,
      first_observed_at, last_observed_at, observation_count
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, now(), now(), 1)
    ON CONFLICT (source_id, sport, raw_player_name) DO UPDATE SET
      last_observed_at       = now(),
      observation_count      = player_drift.observation_count + 1,
      context                = COALESCE(EXCLUDED.context, player_drift.context),
      team_raw_name          = COALESCE(EXCLUDED.team_raw_name, player_drift.team_raw_name),
      external_ids           = COALESCE(EXCLUDED.external_ids, player_drift.external_ids),
      auto_created_player_id = COALESCE(
                                 player_drift.auto_created_player_id,
                                 EXCLUDED.auto_created_player_id
                               ),
      service                = EXCLUDED.service
  `;
  const values: unknown[] = [
    entry.service,
    entry.source_id,
    entry.sport,
    entry.raw_player_name,
    entry.auto_created_player_id ?? null,
    entry.team_raw_name ?? null,
    entry.external_ids ? JSON.stringify(entry.external_ids) : null,
    entry.context ? JSON.stringify(entry.context) : null,
  ];
  return { sql, values };
}

/**
 * Fire-and-forget wrapper around `buildPlayerDriftUpsert`. Same semantics
 * as `logTeamDrift` — swallows DB errors and emits a stderr warning.
 *
 * Example:
 *   await logPlayerDrift(
 *     (sql, values) => pool.query(sql, values),
 *     {
 *       service: 'huddle-data',
 *       source_id: 'bo3gg',
 *       sport: 'cs2',
 *       raw_player_name: 's1mple',
 *       auto_created_player_id: newUuid,
 *       team_raw_name: 'Natus Vincere',
 *       external_ids: [{ source: 'bo3gg', id: '12345' }],
 *       context: { matchId: 'bo3-98765' },
 *     }
 *   );
 */
export async function logPlayerDrift(
  query: PlayerDriftQueryFn,
  entry: PlayerDriftEntry,
): Promise<void> {
  try {
    const { sql, values } = buildPlayerDriftUpsert(entry);
    await query(sql, values);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[player_drift] logPlayerDrift failed for ${entry.source_id}:${entry.sport}:${entry.raw_player_name} — ${msg}`,
    );
  }
}
