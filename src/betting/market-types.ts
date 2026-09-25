/**
 * Canonical market type normalization — THE one stat vocabulary.
 *
 * Moved here from huddle-odds (`src/market-types.ts`) for ENG-1076, unchanged, so that synced bets
 * and odds speak the same stat keys. Before this, huddle-odds mapped every book's market names onto
 * canonical types and huddle-api stored each book's bet legs under the book's own words — `Rec
 * Yards` from PrizePicks, `Receiving Yards` from Underdog, `Travis Kelce Receptions O/U` from
 * DraftKings — with nothing joining them. Two copies of this map would drift the way every other
 * duplicated constant in this workspace has; one copy in core cannot.
 *
 * Each book's client extracts the raw stat name from its own format, then calls
 * normalizeMarketType() to get the canonical form.
 */

export const MARKET_TYPE_MAP: Record<string, string> = {
  // Points
  points: "points", player_points: "points", over_under: "points",
  // Rebounds
  rebounds: "rebounds", player_rebounds: "rebounds",
  // Assists
  assists: "assists", player_assists: "assists",
  // Threes
  threes: "threes", three_points_made: "threes", "3-pt_made": "threes", player_threes: "threes", made_3_point_field_goals: "threes",
  // Steals
  steals: "steals", player_steals: "steals",
  // Blocks
  blocks: "blocks", player_blocks: "blocks", blocked_shots: "blocks", player_blocked_shots: "blocks",
  // Turnovers
  turnovers: "turnovers", player_turnovers: "turnovers",
  // Combos
  "pts+rebs": "pts+rebs", pts_rebs: "pts+rebs", "points_+_rebounds": "pts+rebs",
  "pts+asts": "pts+asts", pts_asts: "pts+asts", "points_+_assists": "pts+asts",
  "pts+rebs+asts": "pts+rebs+asts", pts_rebs_asts: "pts+rebs+asts", "points_+_rebounds_+_assists": "pts+rebs+asts",
  "rebs+asts": "rebs+asts", rebs_asts: "rebs+asts", "rebounds_+_assists": "rebs+asts",
  "blks+stls": "blks+stls", blocks_steals: "blks+stls", "blocks_+_steals": "blks+stls",
  // BetMGM MLB props. The client parses these correctly; without an entry here
  // `isUsefulMarket` drops them before they are ever written, which is why 6,950
  // BetMGM player-prop markets produced 1 stored row (measured 2026-08-04).
  //
  // One maps onto a type other books already write, so it cross-book matches:
  pitcher_outs: "outs_recorded",
  //
  // `player_combined_bases` used to sit here beside it, on the same reasoning. It does not
  // belong: "Detroit Tigers: Player combined bases" prices a *pair* — "Kevin McGonigle
  // (DET) and Dillon Dingler (DET) to combine for 5+ total bases" — and `total_bases` is
  // one batter's. Matching the two cross-book compares different bets.
  //
  // It also cannot be stored honestly. `odds_current` has one `player` column and this
  // market has two players, so `categorizeMarket` reads the club at the front of the name,
  // answers `team_props`, and the row lands under `total_bases` with an empty player:
  // 21 such rows beside 224 real ones, measured 2026-08-09.
  //
  // With no entry the type stays `player_combined_bases`, `isUsefulMarket` drops it, and
  // `recordDrop` counts it into the coverage line — so it is visible rather than silent.
  // That is already what BetMGM's NBA form does: `player_combined_points` has never had an
  // entry and has always been dropped. This makes the two agree.
  // Three are real stats no other book currently sends. New canonical types.
  stolen_bases: "stolen_bases",
  pitcher_earned_runs: "earned_runs",
  "hits,_runs_and_rbis": "hits_runs_rbis",
  //
  // Deliberately absent: `regular_season_strikeouts_-_(player's_team_must_play_159_regular_season_games)`
  // and every `moneyline_and_both_teams_to_score_N+_runs` variant. The first is a
  // season-long future, which is the ENG-519 defect — a season line compared
  // against a single game reads as a trend and is meaningless. The rest are
  // exotic combos that inflate the table without being priceable anywhere else.
  // 6,081 of the 6,088 dropped BetMGM types are that shape and should stay dropped.
  // Milestones
  double_doubles: "double_doubles", triple_doubles: "triple_doubles",
  // Game lines
  moneyline: "moneyline", spread: "spread", total: "total",
  // The long spellings, which the inning-scoped markets arrive with —
  // "8th_inning_total_runs" resolves its base through this.
  total_runs: "total", total_points: "total", total_goals: "total",
  // A team's total, which is a different question from the game's total at a different
  // number. Kept apart so a consensus is never built across the two.
  team_total: "team_total", team_total_runs: "team_total",
  team_total_points: "team_total", team_total_goals: "team_total",
  // DraftKings' spellings. Its alternate ladders were only reachable at all from
  // 2026-08-04, and arrived with no entry here, so they were fetched and then dropped.
  total_alternate: "total", alternate_total_runs: "total",
  alternate_team_total_runs: "team_total", alternate_team_runs: "team_total",
  // CS2 segment markets. **No source currently produces these.** Thunderpick did, and was
  // removed on 2026-08-05 when its API key stopped authenticating and was not replaced;
  // PrizePicks and Underdog cover CS2 with player props and price no map winners.
  //
  // Kept because the rule they encode is the point and outlives the book that prompted it:
  // a map winner and a match winner are different questions at different numbers. Any
  // esports book added later will need exactly this, and rediscovering it costs more than
  // the twelve lines. Best-of-five is the longest format played, so maps 1-5 covers every
  // series.
  //
  // Each map is its own type for the same reason maps 1-2 kills is not kills: a map
  // winner and a match winner are different questions at different numbers, and one
  // type would let the prop matcher build a consensus across markets that are not
  // comparable. It is also what keeps them apart in odds_current's unique key —
  // all three map winners of a series share event, player, selection and line.
  total_rounds: "total_rounds",
  moneyline_map1: "moneyline_map1", moneyline_map2: "moneyline_map2",
  moneyline_map3: "moneyline_map3", moneyline_map4: "moneyline_map4",
  moneyline_map5: "moneyline_map5",
  total_rounds_map1: "total_rounds_map1", total_rounds_map2: "total_rounds_map2",
  total_rounds_map3: "total_rounds_map3", total_rounds_map4: "total_rounds_map4",
  total_rounds_map5: "total_rounds_map5",
  // A CS2 series' map handicap and its total maps played (ENG-1092). Neither is `spread` or
  // `total`: a series is scored in maps, so "BCA -1.5" means winning 2-0 and "over 2.5" means a
  // decider is played, where every other sport's spread and total count points. Filed as
  // `spread`, a map handicap sits in the same consensus as a round handicap on one map, and
  // Pinnacle was writing its ±1.5 map lines exactly that way until this type existed.
  map_handicap: "map_handicap", maps_handicap: "map_handicap",
  total_maps: "total_maps", maps_total: "total_maps", total_maps_played: "total_maps",
  // NHL
  goals: "goals", player_goals: "goals",
  any_time_goal_scorer: "goals", anytime_goalscorer: "goals",
  first_goal_scorer: "goals", "1st_goalscorer": "goals",
  second_goal_scorer: "goals", third_goal_scorer: "goals",
  overtime_goal_scorer: "goals",
  "1st_period_any_time_goal_scorer": "goals",
  "2nd_period_any_time_goal_scorer": "goals",
  "3rd_period_any_time_goal_scorer": "goals",
  player_to_score_2_goals: "goals", "player_to_score_2+_goals": "goals",
  player_to_score_3_goals: "goals", "player_to_score_3+_goals": "goals",
  player_goal_milestones: "goals",
  shots_on_goal: "shots", player_shots_on_goal: "shots",
  shots: "shots",
  player_to_record_1_shots_on_goal: "shots", "player_to_record_1+_shots_on_goal": "shots",
  player_to_record_2_shots_on_goal: "shots", "player_to_record_2+_shots_on_goal": "shots",
  player_to_record_3_shots_on_goal: "shots", "player_to_record_3+_shots_on_goal": "shots",
  player_to_record_4_shots_on_goal: "shots", "player_to_record_4+_shots_on_goal": "shots",
  player_to_record_5_shots_on_goal: "shots", "player_to_record_5+_shots_on_goal": "shots",
  player_to_record_6_shots_on_goal: "shots", "player_to_record_6+_shots_on_goal": "shots",
  player_to_record_7_shots_on_goal: "shots", "player_to_record_7+_shots_on_goal": "shots",
  "1st_period_player_1+_shots_on_goal": "shots",
  "1st_period_player_2+_shots_on_goal": "shots",
  "1st_period_player_3+_shots_on_goal": "shots",
  "2nd_period_player_1+_shots_on_goal": "shots",
  "2nd_period_player_2+_shots_on_goal": "shots",
  "2nd_period_player_3+_shots_on_goal": "shots",
  "3rd_period_player_1+_shots_on_goal": "shots",
  "3rd_period_player_2+_shots_on_goal": "shots",
  "3rd_period_player_3+_shots_on_goal": "shots",
  hits: "hits", player_hits: "hits",
  saves: "saves", player_saves: "saves", goalie_saves: "saves",
  "1st_period_player_alt_saves": "saves",
  "2nd_period_player_alt_saves": "saves",
  "3rd_period_player_alt_saves": "saves",
  player_to_record_1_points: "points", "player_to_record_1+_points": "points",
  player_to_record_2_points: "points", "player_to_record_2+_points": "points",
  "1st_period_player_1+_points": "points",
  "2nd_period_player_1+_points": "points",
  "3rd_period_player_1+_points": "points",
  player_to_record_1_assists: "assists", "player_to_record_1+_assists": "assists",
  time_on_ice: "time_on_ice",
  faceoffs_won: "faceoffs_won",
  "plus/minus": "plus_minus",
  // NFL / NCAAF
  passing_yards: "passing_yards", player_passing_yards: "passing_yards",
  rushing_yards: "rushing_yards", player_rushing_yards: "rushing_yards",
  receiving_yards: "receiving_yards", player_receiving_yards: "receiving_yards",
  passing_touchdowns: "passing_tds", player_passing_touchdowns: "passing_tds",
  pass_tds: "passing_tds",
  rushing_touchdowns: "rushing_tds", player_rushing_touchdowns: "rushing_tds",
  rush_tds: "rushing_tds",
  receiving_touchdowns: "receiving_tds",
  // First, last and anytime TD scorer are THREE DIFFERENT EVENTS and had one type
  // between them. Every row the `anytime_td` type has ever held — 257 all time, 205
  // live — is a First TD Scorer market; not one genuine anytime row has ever arrived.
  //
  // The prices say so unarguably. First TD implied probabilities top out at Jahmyr
  // Gibbs 25.1%, then Henry 21.0, Barkley 18.4, Kelce 9.1 — and they sum to ~1 across
  // a game, because exactly one player scores first. Anytime TD for a workhorse back
  // is 45-60%. A market whose MAXIMUM is 25% cannot be anytime.
  //
  // Left as it was, a projection for `anytime_td` would price P(TD >= 1) — north of
  // 40% for a starter — against a market implying 17-25%, and the detector would have
  // reported an enormous edge on all 205 rows. Wrong on every one, and presenting as
  // "205 new priceable markets" rather than as a defect.
  //
  // `period_first_touchdown_scored` is Underdog's spelling of the GAME's first TD, not
  // a period-scoped one — the comment that used to sit here said so ("Jalen Hurts First
  // TD Scorer") while the mapping asserted otherwise, and the live rows agree. It joins
  // first_td_scorer rather than getting a period type of its own.
  anytime_touchdown_scorer: "anytime_td", anytime_td_scorer: "anytime_td",
  first_touchdown_scorer: "first_td_scorer",
  period_first_touchdown_scored: "first_td_scorer",
  last_touchdown_scorer: "last_td_scorer",
  // A TEAM's defense or special teams scoring a touchdown — interception, fumble, kick, punt
  // or blocked-kick return (ENG-1157, from Caesars bets). Canonical only: each book's own
  // spelling is aliased where its bets are read (huddle-api's BOOK_ALIASES), so no odds feed
  // starts storing a market it did not store before.
  dst_td: "dst_td",
  // Kicking, which the map had only as `kicking_points`.
  extra_points_made: "extra_points", extra_points: "extra_points",
  completions: "completions", player_completions: "completions",
  pass_completions: "completions",
  receptions: "receptions", player_receptions: "receptions",
  interceptions: "interceptions", player_interceptions: "interceptions",
  pass_attempts: "pass_attempts", player_pass_attempts: "pass_attempts",
  rushing_attempts: "rush_attempts", player_rushing_attempts: "rush_attempts",
  rush_attempts: "rush_attempts",
  "passing_+_rushing_yards": "pass+rush_yards", "pass+rush_yards": "pass+rush_yards",
  "rushing_+_receiving_yards": "rush+rec_yards", "rush+rec_yards": "rush+rec_yards",
  // The DFS books abbreviate, and the map only held the long spellings. Measured
  // 2026-08-04 against the NFL preseason board: Underdog stored 4% of its selections and
  // PrizePicks 37%, almost entirely on these. NFL opens in five days.
  rush_yards: "rushing_yards", rushing_yds: "rushing_yards", rush_yds: "rushing_yards",
  rec_yards: "receiving_yards", receiving_yds: "receiving_yards", rec_yds: "receiving_yards",
  pass_yards: "passing_yards", passing_yds: "passing_yards", pass_yds: "passing_yards",
  int: "interceptions", ints: "interceptions", passing_ints: "interceptions",
  // Touchdowns from scrimmage — rushing and receiving combined. A real market with no
  // canonical type until now; `rush+rec_yards` had one and its touchdown twin did not.
  "rush+rec_tds": "rush+rec_tds", rush_rec_tds: "rush+rec_tds",
  "rushing_+_receiving_tds": "rush+rec_tds", "rush_+_rec_tds": "rush+rec_tds",
  longest_completion: "longest_completion",
  longest_reception: "longest_reception",
  longest_rush: "longest_rush",
  kicking_points: "kicking_points",
  field_goals_made: "field_goals", field_goals: "field_goals",
  sacks: "sacks", player_sacks: "sacks",
  tackles: "tackles", "tackles_+_assists": "tackles",
  // MLB
  total_bases: "total_bases", player_total_bases: "total_bases",
  home_runs: "home_runs", player_home_runs: "home_runs",
  runs: "runs", player_runs: "runs",
  // BetMGM writes the plural with an apostrophe, which no other book does. 534 selections
  // per MLB cycle were dropped for it (measured 2026-08-04).
  rbi: "rbi", runs_batted_in: "rbi", "rbi's": "rbi", rbis: "rbi",
  // DraftKings spells the combo and the batter-walk market its own way again.
  "hits_+_runs_+_rbis": "hits_runs_rbis", "walks_(batter)": "walks",
  // MGM's name for the baseball spread. 180 selections a cycle, dropped as an unknown type
  // while the same market from every other book was stored as `spread`.
  run_line_spread: "spread",
  pitcher_strikeouts: "strikeouts", player_strikeouts: "strikeouts",
  strikeouts: "strikeouts",
  earned_runs: "earned_runs", player_earned_runs: "earned_runs",
  hits_allowed: "hits_allowed", walks_allowed: "walks_issued",
  pitching_outs: "outs_recorded", player_pitching_outs: "outs_recorded",
  // FanDuel MLB milestone markets — one canonical stat per line, multiple
  // threshold tiers ("to record 2+ hits", "to record 3+ hits") share the
  // same market_type and the `line` column distinguishes them. Same shape
  // as NHL's player_to_record_X+_shots_on_goal block above.
  player_to_record_a_hit: "hits", to_record_a_hit: "hits",
  "player_to_record_2+_hits": "hits", "to_record_2+_hits": "hits",
  "player_to_record_3+_hits": "hits", "to_record_3+_hits": "hits",
  "player_to_record_4+_hits": "hits", "to_record_4+_hits": "hits",
  to_record_a_run: "runs", "to_record_2+_runs": "runs", "to_record_3+_runs": "runs",
  to_record_an_rbi: "rbi",
  "to_record_2+_rbis": "rbi", "to_record_3+_rbis": "rbi", "to_record_4+_rbis": "rbi",
  "to_record_2+_total_bases": "total_bases", "to_record_3+_total_bases": "total_bases",
  "to_record_4+_total_bases": "total_bases", "to_record_5+_total_bases": "total_bases",
  to_record_a_home_run: "home_runs", "to_record_2+_home_runs": "home_runs",
  // ── MLB vocabulary the map was missing entirely ──────────────────────────
  //
  // Measured 2026-08-04 against live payloads: we stored 18% of FanDuel's selections,
  // 48% of PrizePicks' and 63% of Underdog's. Most of the shortfall was not exotica, it
  // was ordinary props whose spelling simply had no entry here — and `isUsefulMarket`
  // drops an unknown type silently, so the loss never surfaced.
  //
  // Two distinctions the map has to keep, because they are different markets:
  //
  //   * A batter's strikeouts are not a pitcher's. `strikeouts` already means the
  //     pitcher's, so the batter's needs its own type or the two average together into
  //     a consensus that describes neither.
  //   * A batter's walks are not walks issued. `walks_allowed -> walks_issued` is the
  //     pitcher's side and already here; `walks` is the batter's.
  singles: "singles", player_singles: "singles", to_hit_a_single: "singles",
  doubles: "doubles", player_doubles: "doubles", to_hit_a_double: "doubles",
  triples: "triples", player_triples: "triples", to_hit_a_triple: "triples",
  walks: "walks", player_walks: "walks", batter_walks: "walks",
  hitter_strikeouts: "batter_strikeouts", batter_strikeouts: "batter_strikeouts",
  plate_appearances: "plate_appearances", plate_appearance: "plate_appearances",
  // Not the same market as the count above. BetMGM prices the *outcome* of one plate
  // appearance — Walk/Hit By Pitch, Strikeout, Single, Double — where PrizePicks and
  // FanDuel price how many a batter gets. One question is categorical and the other is a
  // line, so merging them would build a consensus across markets that cannot be compared.
  // Scoped per appearance via the shared suffix: plate_appearance_outcome_pa1.
  plate_appearance_outcome: "plate_appearance_outcome",
  // Deliberately NOT mapping BetMGM's `winner`. It lists the same market twice —
  // "First 7 innings: Moneyline" and "First 7 innings: Winner" — so aliasing it collides
  // the pair on one odds_current row, and since main_line cannot separate them the row
  // would flip between the two on every poll and append to odds_history each time. The
  // Moneyline spelling is already stored; the alias buys 80 duplicate selections and
  // risks the defect this service spent the day removing.
  runs_allowed: "runs_allowed", earned_runs_allowed: "earned_runs",
  total_runs_allowed: "runs_allowed",
  // Surfaced by the coverage report on its first cycle, which is what it is for. The
  // period-prefix rule below turns Underdog's `period_1_batters_faced` into
  // `batters_faced_p1`, and a segment suffix only survives isUsefulMarket if its base is
  // canonical — so converting the scope without adding the stat dropped it anyway.
  batters_faced: "batters_faced",
  pitch_count: "pitch_count", pitches_thrown: "pitch_count",
  strikeouts_thrown: "strikeouts",
  outs: "outs_recorded",
  bases: "total_bases",
  // PrizePicks and FanDuel spell the combo differently from BetMGM, whose
  // "hits,_runs_and_rbis" is already mapped above.
  "hits+runs+rbis": "hits_runs_rbis",
  "player_to_record_1+_hits+runs+rbis": "hits_runs_rbis",
  "player_to_record_2+_hits+runs+rbis": "hits_runs_rbis",
  "player_to_record_3+_hits+runs+rbis": "hits_runs_rbis",
  "player_to_record_4+_hits+runs+rbis": "hits_runs_rbis",
  // Milestone forms of stats already canonical. The line column carries the threshold,
  // exactly as the NHL shots-on-goal block above does.
  to_hit_a_home_run: "home_runs",
  "to_hit_2+_home_runs": "home_runs", "to_hit_3+_home_runs": "home_runs",
  to_record_a_stolen_base: "stolen_bases", "to_record_2+_stolen_bases": "stolen_bases",
  // Fantasy scoring, which each book names its own way.
  //
  // Hitter and pitcher are SEPARATE types. They collapsed into one `fantasy` until
  // ENG-823, and they are not the same quantity or the same scale: measured on the
  // PrizePicks board, pitcher fantasy runs 7.5-55.5 (median 27.5) against hitters at
  // 1.5-18.5 (median 5.0). Pooled, `v_prop_candidates` took a median across both and
  // served it to the client as one consensus.
  //
  // `fantasy_points` is Underdog's spelling and stays generic ON PURPOSE — it carries
  // no role marker anywhere. Every Underdog row is "<player> Fantasy Points", so
  // `Zack Wheeler Fantasy Points` at 39.5 and a hitter at 6.5 are indistinguishable
  // from the name. Splitting that one needs a roster lookup, which is deferred; mapping
  // it to `hitter_fantasy` here would be a guess that happens to be right ~85% of the
  // time and silently wrong for every starting pitcher.
  //
  // Do not "tidy" these back together. The CS2 entries below are a different market
  // that resolves correctly, and they are deliberately left as plain `fantasy`.
  fantasy_points: "fantasy",
  hitter_fantasy_score: "hitter_fantasy",
  pitcher_fantasy_score: "pitcher_fantasy",

  // Esports
  kills: "kills", player_kills: "kills",
  deaths: "deaths", headshots: "headshots",
  // Map scoping. CS2 is best-of-three, so "maps 1-3" is the full match and correctly
  // shares a type with the unscoped stat. "Maps 1-2" is a genuine subset and must not —
  // a two-map line and a full-match line are different markets at different numbers, and
  // giving them one type lets the prop matcher cluster them into a consensus across
  // markets that are not comparable.
  "maps_1-2_kills": "kills_2map", "maps_1-2_kills_(combo)": "kills_2map", kills_on_maps_1_2: "kills_2map",
  "maps_1-3_kills": "kills", "maps_1-3_kills_(combo)": "kills",
  kills_on_maps_1_2_3: "kills", kills_on_game_1_2_3: "kills",
  assists_on_maps_1_2_3: "assists",
  // Map 1 alone, by the same rule as maps 1-2 above: a single-map line is a different
  // market at a different number, so it gets its own type rather than folding into
  // `kills`/`kills_2map`.
  //
  // Both books moved their whole CS2 board onto these on 2026-08-11 — the last rows we
  // stored under the old names were 09:51 (kills_2map) and 09:46 (headshots_2map), and
  // from then until this landed every one of the 305 offered markets was dropped as
  // unrecognised. CS2 served no odds, no middles and no picks for the rest of the day
  // with `fail=0` on every poll (ENG-672).
  kills_on_map_1: "kills_map1", map_1_kills: "kills_map1",
  "map_1_kills_(combo)": "kills_map1", "maps_1_kills": "kills_map1",
  // Headshots followed the kills convention for maps 1-3 but not for maps 1-2, where it
  // collapsed onto the full-match type (ENG-464).
  "maps_1-2_headshots": "headshots_2map", headshots_on_maps_1_2: "headshots_2map",
  headshots_on_map_1: "headshots_map1", map_1_headshots: "headshots_map1",
  "map_1_headshots_(combo)": "headshots_map1", "maps_1_headshots": "headshots_map1",
  fantasy_points_on_games_1_2_3: "fantasy", period_1_2_3_fantasy_points: "fantasy",
  fantasy: "fantasy", fantasy_score: "fantasy",
  "series_k/d": "kd_ratio",
};

const CANONICAL_TYPES = new Set(Object.values(MARKET_TYPE_MAP));

/** FanDuel-specific stat fragment normalization */
const FD_STAT_MAP: Record<string, string> = {
  "points_+_rebounds_+_assists": "pts+rebs+asts", "pts_+_reb_+_ast": "pts+rebs+asts",
  "points_+_rebounds": "pts+rebs", "pts_+_reb": "pts+rebs",
  "points_+_assists": "pts+asts", "pts_+_ast": "pts+asts",
  "rebounds_+_assists": "rebs+asts", "reb_+_ast": "rebs+asts",
  "points": "points", "rebounds": "rebounds", "assists": "assists",
  "threes": "threes", "steals": "steals", "blocks": "blocks",
  "1st_quarter_points": "points",
};

/**
 * Normalize a market type string to its canonical form.
 * Handles all book formats: raw stat names, FanDuel's player_X_total_ prefix, etc.
 */
export function normalizeMarketType(type: string): string {
  const key = type.toLowerCase().replace(/\s+/g, "_");

  // Direct match
  if (key in MARKET_TYPE_MAP) return MARKET_TYPE_MAP[key];

  // FanDuel pattern: player_X_total_points_+_rebounds → pts+rebs
  // `pitcher_` as well as `player_`: FanDuel uses it for starting-pitcher props
  // (`pitcher_c_strikeouts`), and only the `player_` half was matched.
  const fdMatch = key.match(/^(?:player|pitcher)_[a-z]_(?:alt_)?(?:total_)?(.+)$/);
  if (fdMatch) {
    const stat = fdMatch[1];
    if (stat in FD_STAT_MAP) return FD_STAT_MAP[stat];
    const direct = MARKET_TYPE_MAP[stat];
    if (direct) return direct;
  }

  // Underdog scopes a stat to a period with a prefix — `period_1_strikeouts`. Turn it into
  // the segment suffix the rest of the system uses, so it reads the same as BetMGM's
  // `strikeouts_inn1` and passes `isUsefulMarket` on its base stat.
  // A range of periods is a half. Underdog writes the first half as `period_1_2_` and its
  // own market name says so — "Bo Nix 1H Pass Yards". Reading only the first number left
  // the second one glued to the stat (`2_passing_yds`), which matched nothing and dropped
  // the market: 272 selections on the NFL preseason board.
  const halfMatch = key.match(/^period_(\d+)_(\d+)_(.+)$/);
  if (halfMatch) {
    const [, from, to, stat] = halfMatch;
    const base = MARKET_TYPE_MAP[stat] ?? stat;
    // 1-2 and 3-4 are the two halves of a four-period game. Anything else keeps the range
    // rather than pretending to know what it means.
    const scope = from === "1" && to === "2" ? "h1" : from === "3" && to === "4" ? "h2" : `p${from}`;
    return `${base}_${scope}`;
  }

  const periodMatch = key.match(/^period_(\d+)_(.+)$/);
  if (periodMatch) {
    const base = MARKET_TYPE_MAP[periodMatch[2]] ?? periodMatch[2];
    return `${base}_p${periodMatch[1]}`;
  }

  // FanDuel scopes with an ordinal prefix — `8th_inning_hits`, `1st_inning_total_runs`.
  // Every book expresses a segment differently and this is the fourth spelling: BetMGM
  // uses a colon prefix, DraftKings a dash suffix, Underdog `period_N_`. They all have to
  // arrive at the same shape, or a scoped market shares a market_type with the full-game
  // one and the two overwrite each other on the unique key.
  const inningMatch = key.match(/^(\d+)(?:st|nd|rd|th)_inning_(.+)$/);
  if (inningMatch) {
    const base = MARKET_TYPE_MAP[inningMatch[2]] ?? inningMatch[2];
    return `${base}_inn${inningMatch[1]}`;
  }

  return key;
}

/**
 * Suffixes that scope a canonical type to part of a game rather than the whole of it.
 *
 * A first-five-innings total and a full-game total are different questions at different
 * numbers — the same rule `total_rounds_map1` already states for CS2, generalised so every
 * sport's segments do not each need their own row in the map above.
 *
 * They must be a suffix on the canonical type rather than a separate column, because
 * `odds_current` is unique on `(source_id, event_id, player, market_type, selection, line)`
 * and `market_type` is the only field that can carry the scope. Without it, BetMGM's 50
 * "First 5 innings: Total runs" markets and its full-game runs markets shared rows and
 * overwrote each other on every poll.
 */
const SEGMENT_SUFFIX = /_(f\d+|inn\d+(?:top|bot)?|pa\d+|h[1-2]|q[1-4]|p[1-3])$/;

/**
 * Check if a market type is one we track (game lines + standard player props).
 * Returns false for exotic/noisy markets that inflate the DB without value.
 *
 * A segment-scoped type is useful exactly when the stat it scopes is useful — otherwise
 * every client that scopes a market would silently have it dropped by this filter, which
 * is how BetMGM's MLB props produced one stored row.
 */
export function isUsefulMarket(type: string): boolean {
  const canonical = normalizeMarketType(type);
  if (CANONICAL_TYPES.has(canonical)) return true;
  const base = canonical.replace(SEGMENT_SUFFIX, "");
  return base !== canonical && CANONICAL_TYPES.has(base);
}
