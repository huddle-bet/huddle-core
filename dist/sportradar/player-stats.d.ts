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
/**
 * MLB: a two-way player carries both lines, and BOTH survive.
 *
 * Batting wins the plain keys on a collision (`H`, `R`, `BB`, `K`, `HR`, `#P`) — that is what
 * every stored row already means and a flip would change every two-way player's batting line.
 * The pitching line is ALSO written, always, under `P_<key>`: `P_K`, `P_H`, `P_BB`, `P_R`,
 * `P_HR`, `P_#P` and the rest. A pure pitcher's row therefore holds both `K` and `P_K` with the
 * same value, and a reader that wants the pitching number takes `P_K ?? K` — right on a row
 * written today, right on a row written before this existed, and right on Shohei Ohtani's.
 *
 * Measured 2026-09-08 before this: Ohtani had 11 two-way rows this season (4–6.2 IP, real
 * starts) and every one held his BATTING strikeouts under `K`, with the pitching strikeouts —
 * the market every book prices — not in the row at all. Settlement refused rather than graded
 * (huddle-engine#209) because the number could not be recovered; now it can.
 */
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
/**
 * The MLB starting lineup, as a set of Sportradar player ids.
 *
 * MLB is the one league whose summary carries **no player-level `starter` flag** — measured
 * 2026-09-09 on a real closed game (MIN at DET, `061815ce`) and on the committed fixture, 0
 * of 30 players on either side hold the key. nba and nhl send `starter: true` on the starters
 * and omit it otherwise, so `Boolean(p.starter)` is right for them and always false for mlb.
 * That is why the box score's STARTERS split was dark on baseball while looking fine
 * elsewhere (ENG-889).
 *
 * The information is in the same payload under a different name. `team.lineup[]` holds one
 * entry per player who took a lineup slot, and **`inning: 0` is the entry that took the field
 * at first pitch**; a substitution carries the inning it came in. On that real game:
 *
 *     DET  innings {0: 10, 6: 2, 7: 2, 8: 2, 9: 1}   inning-0 positions 1..10, orders 0..9
 *     MIN  innings {0: 10, 6: 1, 7: 3, 8: 1, 9: 1}   inning-0 positions 1..10, orders 0..9
 *
 * Ten a side — the nine fielders plus the DH — with the starting pitcher inside the set on
 * both. So `starting_pitcher` corroborates and adds nobody, and is deliberately not unioned
 * in: a starter who is not in the inning-0 lineup would be a contradiction worth seeing
 * rather than papering over.
 *
 * Taking the first entry per `order` instead gives the identical set on that game. `inning`
 * is preferred because it says what it means; `order` is a lineup index here, not the batting
 * slot — position 1, the pitcher, sits at order 0 in a DH game.
 *
 * **A lineup entry is a (player, role) event, not a player**, and that is the thing to know
 * before touching this. On the same game Kody Clemens started at position 4 and moved to 7 in
 * the seventh, keeping order 3 — two entries, and he is a starter. Spencer Torkelson is the
 * mirror: he entered at inning 6 as position **11**, a pinch hitter, then took position 3 in
 * the seventh — two entries, and he started nothing. So neither "appears once" nor "appears
 * more than once" is the rule; holding an inning-0 entry is. The position vocabulary also runs
 * past the nine fielders and the DH: 11 is a pinch hitter.
 *
 * Returns an empty set when there is no lineup, so a caller marks nobody rather than
 * guessing. An empty set and "everyone is a bench player" are the same row, which is why the
 * caller should keep the league check rather than relying on this to abstain.
 */
export declare function mlbStarterIds(team: unknown): Set<string>;
/**
 * The line score — runs or points by period, in the shape the client already renders.
 *
 * `MatchGameData.lineScore` is `{periods: string[], away, home: (number|null)[], awayTotal,
 * homeTotal}` and until now nothing has ever filled it but the demo fixture, so a live game's
 * Game tab had no line score to draw (ENG-890). The summary carries it per team under
 * `scoring[]`, on the same payload huddle-live already polls for player stats — no new fetch.
 *
 * Three things about the provider's array decide the implementation, and all three are in the
 * committed fixture because a hand-built one would have had none of them:
 *
 * - **nhl arrives REVERSED** — `number` 3, 2, 1 — so array order is not period order.
 * - **nba repeats `number`** — 1, 2, 3, 4, 1, where the fifth is overtime. `number` is a
 *   label WITHIN a period type; only `sequence` is a position. Keying on `number` collides
 *   OT1 with Q1 and silently loses a quarter.
 * - **the value key is sport-specific** — `runs` for mlb, `points` for nba and nhl.
 *
 * So it sorts by `sequence`, positions by `sequence`, and labels from `type` + `number`.
 *
 * **A missing entry is null, never 0.** MLB lists every inning batted, including the scoreless
 * ones, so absence means the half was not batted — a home side leading after the top of the
 * ninth never bats, and the client's own test asserts eight home entries against nine away.
 * Filling those with 0 would say the home team batted and failed to score, which is a
 * different and wrong claim, and is the `?? 0` mistake this file's neighbours keep recording.
 */
export interface SummaryLineScore {
    periods: string[];
    away: Array<number | null>;
    home: Array<number | null>;
    awayTotal: number;
    homeTotal: number;
}
export declare function summaryLineScore(raw: unknown): SummaryLineScore | null;
//# sourceMappingURL=player-stats.d.ts.map