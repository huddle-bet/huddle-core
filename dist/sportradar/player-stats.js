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
/** Sportradar reports made/attempted as a pair; the flat vocabulary stores `"7-12"`. */
function madeAtt(made, att) {
    return `${made ?? 0}-${att ?? 0}`;
}
/** NBA: `player.statistics` is a flat object of totals. */
export function nbaPlayerStats(s) {
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
/** NHL: totals live under `player.statistics.total`. */
export function nhlPlayerStats(total) {
    return {
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
}
/** MLB batting line, from `player.statistics.hitting.overall`. */
export function mlbBatterStats(o) {
    return {
        AB: o.ab ?? 0,
        R: o.runs?.total ?? 0,
        H: o.onbase?.h ?? 0,
        HR: o.onbase?.hr ?? 0,
        RBI: o.rbi ?? 0,
        BB: o.onbase?.bb ?? 0,
        K: o.outs?.ktotal ?? 0,
        AVG: o.avg ?? '',
        OBP: o.obp ?? '',
        SLG: o.slg ?? '',
        '#P': o.pitch_count ?? 0,
        'H-AB': `${o.onbase?.h ?? 0}-${o.ab ?? 0}`,
    };
}
/** MLB pitching line, from `player.statistics.pitching.overall`. */
export function mlbPitcherStats(o) {
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
export function mlbPlayerStats(statistics) {
    const stats = {};
    const h = statistics?.hitting?.overall;
    const pi = statistics?.pitching?.overall;
    if (h)
        Object.assign(stats, mlbBatterStats(h));
    if (pi) {
        // Add pitcher keys without clobbering a two-way player's batting line.
        for (const [k, v] of Object.entries(mlbPitcherStats(pi))) {
            if (!(k in stats))
                stats[k] = v;
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
 */
export function sportradarPlayerStats(sport, statistics) {
    if (!statistics || typeof statistics !== 'object')
        return null;
    switch (sport) {
        case 'nba':
            return nbaPlayerStats(statistics);
        case 'nhl':
            return statistics.total ? nhlPlayerStats(statistics.total) : null;
        case 'mlb': {
            const stats = mlbPlayerStats(statistics);
            return Object.keys(stats).length > 0 ? stats : null;
        }
    }
}
export function isSummaryStatsSport(sport) {
    return sport === 'nba' || sport === 'nhl' || sport === 'mlb';
}
//# sourceMappingURL=player-stats.js.map