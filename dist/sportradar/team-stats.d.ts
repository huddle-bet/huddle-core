/**
 * Team-level per-game statistics extraction — ENG-407.
 *
 * MOVED HERE FROM huddle-data (ENG-890, 2026-09-25) so huddle-live can write the same team rows during
 * play that huddle-data writes at the final, from one copy. Unchanged in behaviour.
 *
 * Every per-game payload we already fetch carries team aggregates; until this
 * module every normalizer emitted `TeamBoxscore.stats: {}` and the writer read
 * only the players array, so the team half of a paid feed was dropped. Each
 * function below flattens one sport's real payload shape (all four verified
 * against live API responses, 2026-08-12) into the flat key-value record
 * `team_game_stats.stats` stores.
 *
 * Flattening rules are deliberately boring: scalars keep their key, one level
 * of nesting joins with `_`, arrays and deeper nesting are skipped. Vocabulary
 * stays the provider's own (possession_time, faceoff_win_pct, ab_risp) — the
 * same decision player_game_stats made, so readers learn one dialect per
 * sport, not two.
 *
 * `nflTeamStats`, `mlbTeamStats` and (since 2026-08-23) `nhlTeamStats` take the whole
 * TEAM object; `nbaTeamStats` takes `team.statistics` because NBA genuinely has nothing
 * outside it. Prefer the team: every defect this module has had was a value sitting one
 * key outside the object the signature asked for.
 */
type Stats = Record<string, string | number>;
/**
 * NFL `statistics.{home,away}`: a flat `summary` block (total_yards,
 * possession_time, turnovers…), per-category `totals` (rushing.totals,
 * passing.totals…), flat category objects (first_downs, touchdowns) and the
 * doubly-nested `efficiency` ({redzone,thirddown,…} × {attempts,successes,pct}).
 */
export declare function nflTeamStats(team: any): Stats;
/** NBA summary `{home,away}.statistics`: ~78 flat scalars, taken as-is. */
export declare function nbaTeamStats(statistics: any): Stats;
/**
 * NHL summary `{home,away}`: no top-level scalars in `statistics` — everything sits
 * in strength-state blocks. `total` keeps bare keys; the others prefix.
 *
 * ## `score` — the shootout decider is not in `statistics`, and 392 finals were stored tied
 *
 * This took `statistics` and read `total` plus the four strength blocks. The NHL's score of
 * record is `team.points`, a **sibling of `statistics` on the team object**, and it was
 * never stored — so a 2-1 shootout win was served as 1-1, in a league that has not
 * permitted a tie since 2005-06.
 *
 * Measured 2026-08-23 over every stored NHL final, and the split is the evidence:
 *
 *   season_type 1 (pre)    19 of   236   8.05%
 *   season_type 2 (reg)   373 of 5,336   6.99%
 *   season_type 3 (post)    0 of   287   0.00%   <- playoffs have no shootout
 *                          ---------------------
 *                         392 of 5,859   6.69%
 *
 * Zero in the one population where a shootout is impossible, and the shootout rate in the
 * two where it is not. 391 of the 392 end on a shootout play. Controls: nba 0 of 5,544,
 * mlb 98 of 10,562 and all 98 are spring training, where a tie is legal.
 *
 * Served to users at `GET /api/v1/game-stats/:eventId/teams`.
 *
 * ## Why the shootout goal is a NEW key and not added to `goals`
 *
 * Two reasons, both measured rather than argued:
 *
 *  1. **`shootout.goals` is not the number to add.** It is rounds converted, not the score.
 *     On `66a45031` (COL @ EDM 2026-04-14) it reads `away 3, home 2` while the game
 *     finished 2-1. Folding it in would produce 4-3 — a different wrong answer. The NHL
 *     credits the shootout winner exactly ONE goal, and `team.points` already carries it.
 *     Verified over 12 games (6 shootout, 6 not): `points - total.goals` is `(1,0)`,
 *     `(0,1)` or `(0,0)` on all 12, never anything else.
 *  2. **`goals` is load-bearing for `check:reconciliation`.** That check sums player `G`
 *     against team `goals` and gates NHL at 0.5%. Re-measured 2026-08-23 it reads **0.107%**
 *     (12 of 11,246 team-games) — not the 0.000% `check-reconciliation.mjs`' own header still
 *     states from 08-19, which is stale. A player's `statistics.total.goals` excludes the
 *     shootout decider too, so moving the team side and not the player side would put 6.69%
 *     of games into that residual and blow the gate by more than tenfold — and moving the
 *     player side would credit a skater with a goal the NHL does not credit him.
 *
 * So `goals` keeps meaning goals scored in play, which is what every other key in this
 * record and every player row it reconciles against already mean, and `score` means the
 * score of record. `check:score-of-record` reads `score`.
 *
 * `shootout_*` is stored beside it because it is the evidence for the difference: a reader
 * who sees `score 2, goals 1` needs `shootout_goals 3, shootout_goals_against 2` in the same
 * row to see why, rather than refetching the payload.
 *
 * Takes the **team**, not `team.statistics` — `nflTeamStats` and `mlbTeamStats` already do,
 * and asking for `statistics` is what made `points` and `shootout` unreachable. A caller
 * cannot hand over a sibling of the thing the signature asks for.
 */
export declare function nhlTeamStats(team: any): Stats;
/**
 * MLB summary `game.{home,away}`: runs/hits/errors on the team object itself,
 * then `statistics.{hitting,pitching,fielding}.overall` with one nested level
 * (onbase, runs, outcome…) flattened `hitting_onbase_*`-style.
 */
export declare function mlbTeamStats(team: any): Stats;
export {};
//# sourceMappingURL=team-stats.d.ts.map