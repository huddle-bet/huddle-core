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
/**
 * The two player-level groups that sit **beside** `statistics`, not inside it.
 *
 * This is the whole of ENG-576. `nhlPlayerStats` took `statistics.total` and nothing
 * else, so a goalie was written as fourteen skater zeros: 68,522 NHL rows, not one
 * carrying a save. The saves were always in the payload we already fetch — one key up
 * the tree. `time_on_ice` was lost the same way, which is why the NHL backtest could
 * not gate on minutes played.
 */
export interface NhlPlayerGroups {
    /** `player.goaltending` — absent on skaters. */
    goaltending?: any;
    /**
     * `player.time_on_ice` — present on everyone who took a shift.
     *
     * Carries `total`, `shifts`, `avg` and the three strength splits
     * `powerplay` / `shorthanded` / `evenstrength`, plus `overtime`. All of them are
     * `"mm:ss"` strings. Only `total` and `shifts` were read until now; power-play TOI
     * is the denominator a power-play-points projection needs, and it was one key over
     * from one this function already read.
     */
    timeOnIce?: any;
}
/**
 * NHL: skater totals live under `player.statistics.total`; the strength splits are its
 * siblings under `statistics`; goaltending and time on ice are siblings of `statistics`
 * itself on the player.
 *
 * ## The argument is `statistics`, not `statistics.total`
 *
 * It took `total` until 2026-08-23 and that shape is what hid the power-play blocks: a
 * caller holding the whole player has no way to hand over a sibling of the thing the
 * signature asks for. `groups` was added for exactly that reason on ENG-576 and it only
 * moved the trap one level up. Widening the parameter removes it rather than papering
 * over it — there is one object, and everything this function reads is reachable from it.
 *
 * A caller that still passes the bare `total` block keeps working and gets what it always
 * got (the fallback below), minus the strength keys it never had. There are two callers in
 * the workspace, huddle-data's `normalize/nhl.ts` and huddle-live's `player-stats.ts`, and
 * both move with this change.
 *
 * `groups` stays optional so an existing caller still gets the skater line. Callers with
 * the player should pass it — a goalie without it is a row of zeros that reads as a real
 * performance.
 */
export declare function nhlPlayerStats(statistics: any, groups?: NhlPlayerGroups): PlayerStatMap;
/**
 * MLB batting line, from `player.statistics.hitting.overall`.
 *
 * `1B`, `2B`, `3B`, `TB` and `SB` were absent here while the board priced all of them.
 * Measured 2026-08-16: **5,872 live odds rows across 1,279 player-markets on four markets the
 * engine could not project** — singles 2,100 rows / 5 books, doubles 1,894 / 5,
 * stolen_bases 1,310 / 5, triples 568 / 3 — and 0 of 2,693 MLB stat rows from the previous
 * week carried any of the keys.
 *
 * The provider was always sending them. `hitting.overall.onbase` carries `s, d, t, hr, tb, bb,
 * ibb, hbp, fc, roe, h, ci, rov, cycle` and `hitting.overall.steal` carries `stolen, caught,
 * pickoff, pct` — both present in the committed fixture. This function read `h`, `hr` and `bb`
 * from `onbase` and discarded the rest of the object.
 *
 * **Not recoverable downstream, which is why it had to be fixed here rather than derived.**
 * `TB` and `H` give two equations in three unknowns (1B, 2B, 3B), so no amount of arithmetic on
 * what was already stored produces a singles or doubles line.
 *
 * `TB` is now taken from the provider even though `total_bases` already projects, because that
 * projection derives it as `SLG x AB` — a derivation added on the stated grounds that
 * "Sportradar writes no TB key", which is false. The derivation is left in place as the
 * fallback for rows written before this change; the direct value is simply better.
 *
 * ## `HBP`, added 2026-08-20 — the same field one over
 *
 * The paragraph above lists everything `onbase` carries, `hbp` included, and this function
 * still read past it. huddle-engine's `UNPRICED` map meanwhile refuses PrizePicks' MLB hitter
 * fantasy score with the reason *"PrizePicks' needs HBP, which appears on no MLB row we
 * store"* — true about our rows, and true only because of this line.
 *
 * That is the identical shape as the 1B/2B/3B/TB/SB miss: a claim about the provider, correct
 * about what we stored, standing in for a claim about what the provider sends. `UNPRICED`'s own
 * comment says it outright — "Nothing belongs in this map on the strength of an unverified
 * claim about the provider."
 *
 * Verified in the committed fixture: `hbp` sits inside `onbase` immediately beside `bb`, which
 * this function already reads. **All five occurrences there are 0**, so the fixture cannot
 * distinguish reading the field from defaulting it, and the test for this uses a synthetic
 * non-zero value instead.
 *
 * This unblocks the DATA half of hitter fantasy only. The scoring formula is still unresolved
 * and still a reason to refuse the market — see `UNPRICED`. Adding a guessed formula on top of
 * a secondhand description is how a wrong number reaches a pick.
 */
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
 *
 * `groups` carries the NHL player-level blocks that sit beside `statistics`. Optional,
 * so an existing caller keeps working; without it an NHL goalie is fourteen zeros
 * (ENG-576).
 */
export declare function sportradarPlayerStats(sport: SummaryStatsSport, statistics: any, groups?: NhlPlayerGroups): PlayerStatMap | null;
export declare function isSummaryStatsSport(sport: string): sport is SummaryStatsSport;
//# sourceMappingURL=player-stats.d.ts.map