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

/** Sportradar reports made/attempted as a pair; the flat vocabulary stores `"7-12"`. */
function madeAtt(made: unknown, att: unknown): string {
  return `${made ?? 0}-${att ?? 0}`;
}

/** NBA: `player.statistics` is a flat object of totals. */
export function nbaPlayerStats(s: any): PlayerStatMap {
  return {
    MIN: s.minutes ?? '',
    PTS: s.points ?? 0,
    REB: s.rebounds ?? 0,
    OREB: s.offensive_rebounds ?? 0,
    DREB: s.defensive_rebounds ?? 0,
    AST: s.assists ?? 0,
    STL: s.steals ?? 0,
    BLK: s.blocks ?? 0,
    TO: s.turnovers ?? 0,
    PF: s.personal_fouls ?? 0,
    '+/-': s.pls_min ?? 0,
    FG: madeAtt(s.field_goals_made, s.field_goals_att),
    '3PT': madeAtt(s.three_points_made, s.three_points_att),
    FT: madeAtt(s.free_throws_made, s.free_throws_att),
  };
}

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
 * The strength states Sportradar reports beside `total`, and the prefix each gets.
 *
 * All three are **siblings of `total` inside `statistics`** — verified against live
 * `summary.json` on 2026-08-23, present on 49 of 49 players in `66a45031` and on 125 of
 * 125 in `63c632c4`. They are also in this package's own committed golden fixture, which
 * is where this should have been caught: `statistics.powerplay` sits immediately beside
 * `statistics.total` in every one of the five NHL pairs in `__fixtures__`, and this
 * function read past it for four months.
 *
 * That absence was then written down as fact in huddle-engine's `UNPRICED` map — "no
 * provider key (nothing power-play in the payload)", justified as "verified across 20,000
 * NHL stat rows". The rows were counted correctly and the conclusion did not follow: it is
 * a claim about what WE STORE standing in for a claim about what the PROVIDER SENDS. That
 * is the third time in this file's history (goaltending, HBP, and now this) and the reason
 * the map's own header says nothing may be listed there on an unverified provider claim.
 *
 * `penalty` and `shootout` are deliberately not here. `penalty` is penalty-shot scoring,
 * which no board prices; `shootout` goals are not credited to the player in any official
 * NHL total (the shootout decider is a TEAM goal — see huddle-data's `nhlTeamStats`), so
 * writing them as `G`-adjacent keys would put a number in the table that settles nothing.
 */
const NHL_STRENGTH_BLOCKS = [
  ['powerplay', 'PP'],
  ['shorthanded', 'SH'],
  ['evenstrength', 'ES'],
] as const;

/** `"mm:ss"` when the provider sent one, else undefined — never `0`, which reads as a real shift. */
function toi(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
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
export function nhlPlayerStats(statistics: any, groups?: NhlPlayerGroups): PlayerStatMap {
  // A pre-2026-08-23 caller hands over the `total` block itself. `total.total` is undefined
  // on every payload we have seen, so this cannot misfire for a caller passing `statistics`.
  const total = statistics?.total ?? statistics ?? {};

  const stats: PlayerStatMap = {
    G: total.goals ?? 0,
    A: total.assists ?? 0,
    SOG: total.shots ?? 0,
    SM: total.missed_shots ?? 0,
    BS: total.blocked_shots ?? 0,
    HT: total.hits ?? 0,
    TK: total.takeaways ?? 0,
    GV: total.giveaways ?? 0,
    '+/-': total.plus_minus ?? 0,
    PIM: total.penalty_minutes ?? 0,
    PN: total.penalties ?? 0,
    FW: total.faceoffs_won ?? 0,
    FL: total.faceoffs_lost ?? 0,
    'FO%': total.faceoff_win_pct ?? 0,
  };

  /**
   * Strength-state scoring. Written unconditionally when the block is there, because a
   * skater with no power-play goal is a REAL zero — the block is present on every player
   * who dressed, scorers and healthy scratches alike — unlike `SV`, which is absent
   * because the player never tended goal.
   *
   * `PPP` is stored rather than left to the reader to add up. It is the quantity the market
   * is actually named after, and the alternative is every consumer writing `PPG + PPA` by
   * hand — a second home for one number, spelled differently in each, which is ENG-628.
   * It is a sum of two provider fields in one expression and cannot desync from them.
   */
  for (const [block, prefix] of NHL_STRENGTH_BLOCKS) {
    const b = statistics?.[block];
    if (!b || typeof b !== 'object') continue;
    const g = b.goals ?? 0;
    const a = b.assists ?? 0;
    stats[`${prefix}G`] = g;
    stats[`${prefix}A`] = a;
    stats[`${prefix}P`] = Number(g) + Number(a);
    stats[`${prefix}SOG`] = b.shots ?? 0;
  }

  // `"18:44"`, the same mm:ss the ESPN feed used, so existing readers parse it unchanged.
  const t = groups?.timeOnIce;
  const totalToi = toi(t?.total);
  if (totalToi) {
    stats.TOI = totalToi;
    stats.SHFT = t?.shifts ?? 0;
    // The splits are separate keys rather than a nested object: `player_game_stats.stats`
    // is a flat map and every existing reader indexes it directly.
    const splits: Array<[string, unknown]> = [
      ['PPTOI', t?.powerplay],
      ['SHTOI', t?.shorthanded],
      ['ESTOI', t?.evenstrength],
      ['OTTOI', t?.overtime],
      ['ATOI', t?.avg],
    ];
    for (const [key, v] of splits) {
      const s = toi(v);
      if (s) stats[key] = s;
    }
  }

  // Only on a player who actually tended goal. A skater carrying SV: 0 would settle a
  // saves prop at zero instead of declining to settle it, which is worse than absent.
  const g = groups?.goaltending?.total;
  if (g) {
    stats.SV = g.saves ?? 0;
    stats.GA = g.goals_against ?? 0;
    stats.SA = g.shots_against ?? 0;
    stats['SV%'] = g.saves_pct ?? 0;
  }

  return stats;
}

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
export function mlbBatterStats(o: any): PlayerStatMap {
  return {
    AB: o.ab ?? 0,
    R: o.runs?.total ?? 0,
    H: o.onbase?.h ?? 0,
    '1B': o.onbase?.s ?? 0,
    '2B': o.onbase?.d ?? 0,
    '3B': o.onbase?.t ?? 0,
    TB: o.onbase?.tb ?? 0,
    SB: o.steal?.stolen ?? 0,
    HR: o.onbase?.hr ?? 0,
    RBI: o.rbi ?? 0,
    BB: o.onbase?.bb ?? 0,
    HBP: o.onbase?.hbp ?? 0,
    K: o.outs?.ktotal ?? 0,
    AVG: o.avg ?? '',
    OBP: o.obp ?? '',
    SLG: o.slg ?? '',
    '#P': o.pitch_count ?? 0,
    'H-AB': `${o.onbase?.h ?? 0}-${o.ab ?? 0}`,
  };
}

/** MLB pitching line, from `player.statistics.pitching.overall`. */
export function mlbPitcherStats(o: any): PlayerStatMap {
  return {
    // ip_2 is already standard baseball notation (5.1 = 5⅓ innings); ip_1 is raw outs.
    IP: o.ip_2 ?? 0,
    H: o.onbase?.h ?? 0,
    R: o.runs?.total ?? 0,
    ER: o.runs?.earned ?? 0,
    BB: o.onbase?.bb ?? 0,
    K: o.outs?.ktotal ?? 0,
    HR: o.onbase?.hr ?? 0,
    '#P': o.pitch_count ?? 0,
    ERA: o.era ?? 0,
    WHIP: o.whip ?? 0,
    BF: o.bf ?? 0,
  };
}

/** MLB: a two-way player carries both lines; batting wins on key collisions. */
export function mlbPlayerStats(statistics: any): PlayerStatMap {
  const stats: PlayerStatMap = {};
  const h = statistics?.hitting?.overall;
  const pi = statistics?.pitching?.overall;
  if (h) Object.assign(stats, mlbBatterStats(h));
  if (pi) {
    // Add pitcher keys without clobbering a two-way player's batting line.
    for (const [k, v] of Object.entries(mlbPitcherStats(pi))) {
      if (!(k in stats)) stats[k] = v;
    }
  }
  return stats;
}

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
export function sportradarPlayerStats(
  sport: SummaryStatsSport,
  statistics: any,
  groups?: NhlPlayerGroups,
): PlayerStatMap | null {
  if (!statistics || typeof statistics !== 'object') return null;
  switch (sport) {
    case 'nba':
      return nbaPlayerStats(statistics);
    case 'nhl':
      // The whole `statistics` object, not `statistics.total` — the powerplay,
      // shorthanded and evenstrength blocks are its siblings (2026-08-23).
      return statistics.total ? nhlPlayerStats(statistics, groups) : null;
    case 'mlb': {
      const stats = mlbPlayerStats(statistics);
      return Object.keys(stats).length > 0 ? stats : null;
    }
  }
}

export function isSummaryStatsSport(sport: string): sport is SummaryStatsSport {
  return sport === 'nba' || sport === 'nhl' || sport === 'mlb';
}
