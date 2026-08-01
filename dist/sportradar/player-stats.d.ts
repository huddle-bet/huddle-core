/**
 * Sportradar per-player box-score flattening, for the sports that have a `summary` feed.
 *
 * ## Why this lives in huddle-core
 *
 * Two services write `player_game_stats` for the same sports, and until now they wrote
 * two different shapes into it:
 *
 * - **huddle-data** backfills closed games and flattens via its `normalize/*` modules,
 *   producing `PTS`/`REB`/`AST`, `G`/`A`/`SOG`, `H`/`HR`/`RBI`.
 * - **huddle-live** polls `summary.json` during a game and wrote the raw nested
 *   `statistics` blob through untouched, by explicit choice — "so downstream can read
 *   any stat without huddle-live needing to enumerate them."
 *
 * `huddle-engine`'s `projections.ts` reads the flat keys. Every lookup against a
 * live-written row missed, so it computed `null` for every stat on every game. Because
 * `getPlayerStats` orders most-recent-first, the window it reads for an in-season sport
 * is almost entirely live-written — MLB had 121 fixtures in a week, 11,558 odds rows,
 * and **zero projections ever** (ENG-460), while the table as a whole was 98.5% healthy
 * from historical backfill. Invisible in aggregate, total in the window that matters.
 *
 * One vocabulary, defined once, used by both writers. That is the only thing that makes
 * a second writer safe.
 *
 * ## Why NFL is not here
 *
 * NFL has no `summary` feed — verified 2026-08-01, `summary.json` returns 404 and
 * `statistics.json` returns 200. Its payload is organised by category at the *team*
 * level (`statistics.{home,away}.{passing,rushing,…}.players[]`) and one player is
 * merged across categories into `category_field` keys. That is not a function of one
 * player's statistics object and cannot share this interface without deforming it.
 * See `normalize/nfl.ts` in huddle-data, and ENG-463.
 */
/** Sports whose Sportradar `summary` feed carries per-player `statistics`. */
export type SummaryStatsSport = 'nba' | 'nhl' | 'mlb';
export type PlayerStatMap = Record<string, string | number>;
/** NBA: `player.statistics` is a flat object of totals. */
export declare function nbaPlayerStats(s: any): PlayerStatMap;
/** NHL: totals live under `player.statistics.total`. */
export declare function nhlPlayerStats(total: any): PlayerStatMap;
/** MLB batting line, from `player.statistics.hitting.overall`. */
export declare function mlbBatterStats(o: any): PlayerStatMap;
/** MLB pitching line, from `player.statistics.pitching.overall`. */
export declare function mlbPitcherStats(o: any): PlayerStatMap;
/** MLB: a two-way player carries both lines; batting wins on key collisions. */
export declare function mlbPlayerStats(statistics: any): PlayerStatMap;
/**
 * Flatten one player's `statistics` for a summary-feed sport.
 *
 * Returns `null` when there is nothing to flatten, so a caller can distinguish "this
 * player has no stats" from "this player has all-zero stats" — writing a row of zeros
 * for someone who never appeared is its own kind of wrong data.
 */
export declare function sportradarPlayerStats(sport: SummaryStatsSport, statistics: any): PlayerStatMap | null;
export declare function isSummaryStatsSport(sport: string): sport is SummaryStatsSport;
//# sourceMappingURL=player-stats.d.ts.map