/**
 * Sportradar NFL per-player box-score flattening.
 *
 * NFL sits apart from NBA/NHL/MLB and cannot share `sportradarPlayerStats`:
 *
 *   - It has **no `summary` feed**. Verified 2026-08-01: `summary.json` returns 404 and
 *     `statistics.json` returns 200. huddle-data has known this since it built a
 *     separate `fetchGameStatistics`; huddle-live did not, and polled `summary.json`
 *     for NFL anyway, so it would have written zero live NFL player rows all season
 *     while logging a 404 warning every 30 seconds (ENG-463).
 *   - Its payload is organised **by category at team level** —
 *     `statistics.{home,away}.{passing,rushing,receiving,…}.players[]` — rather than one
 *     `statistics` object per player. A quarterback appears under both `passing` and
 *     `rushing`, so players are coalesced into one row with category-prefixed keys:
 *     `passing_yards`, `rushing_attempts`, `receiving_receptions`.
 *
 * That prefixing is the vocabulary huddle-engine reads (`PROP_STATS_BY_LEAGUE.nfl`), and
 * it is deliberate rather than incidental: the compact ESPN-era keys were ambiguous
 * because `YDS` mapped to passing, rushing and receiving at once against a flat lookup
 * (ENG-395). Do not reintroduce them as fallbacks.
 *
 * Lives here so huddle-data's backfill and huddle-live's in-game poll produce identical
 * rows. Two writers with two shapes is what left MLB with zero projections (ENG-460).
 */
export interface NflPlayerLine {
    name: string;
    athleteId?: string;
    position?: string;
    stats: Record<string, string | number>;
}
/**
 * Flatten one team's categorised statistics into one row per player.
 *
 * Order is first-appearance, so output is stable across runs for a given payload.
 */
export declare function nflTeamPlayerStats(team: any): NflPlayerLine[];
/** Both teams from a `statistics.json` payload, as `{ home, away }`. */
export declare function nflGamePlayerStats(statistics: any): {
    home: NflPlayerLine[];
    away: NflPlayerLine[];
};
//# sourceMappingURL=nfl-player-stats.d.ts.map