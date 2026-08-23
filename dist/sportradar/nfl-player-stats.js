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
/** Player-identity keys on a category entry — descriptive, not statistics. */
const IDENTITY_FIELDS = new Set([
    'id', 'name', 'jersey', 'position', 'sr_id', 'reference', 'played', 'started',
]);
/**
 * Flatten one team's categorised statistics into one row per player.
 *
 * Order is first-appearance, so output is stable across runs for a given payload.
 */
export function nflTeamPlayerStats(team) {
    const byId = new Map();
    if (!team || typeof team !== 'object')
        return [];
    for (const [category, group] of Object.entries(team)) {
        // `summary` is the team's own totals, not a player group.
        if (IDENTITY_FIELDS.has(category) || category === 'summary')
            continue;
        // Most categories are `{ totals, players[] }`. `extra_points` is not: it nests one level
        // deeper as `{ kicks: {players[]}, conversions: {players[]} }`, so a `group.players` read
        // finds nothing and the whole category was skipped in silence — no error, no empty array,
        // just an absent branch. A player appearing ONLY there therefore got no row at all
        // (Evan Svoboda, a 2-point conversion receiver on SF@LAC 2026-08-21), and every kicker
        // and conversion participant lost those stats.
        //
        // Flattening one level down rather than special-casing `extra_points` by name: the shape
        // is "a group whose entries are themselves player groups", and keying on the shape means
        // a second such category does not have to be discovered the same way this one was.
        //
        // `check:provider-boxscore` is structurally blind to this — it re-normalizes both sides,
        // so a field the normalizer never reads is absent from its "provider" side too and the
        // comparison agrees. Only reading the raw payload finds it.
        const subGroups = Array.isArray(group?.players)
            ? [[category, group]]
            : Object.entries(group ?? {})
                .filter(([, sub]) => Array.isArray(sub?.players))
                .map(([sub, v]) => [`${category}_${sub}`, v]);
        for (const [prefix, holder] of subGroups) {
            const players = holder?.players;
            if (!Array.isArray(players))
                continue;
            for (const p of players) {
                const key = p.id ?? p.sr_id ?? p.name;
                if (!key)
                    continue;
                let entry = byId.get(key);
                if (!entry) {
                    entry = { name: p.name, athleteId: p.id, position: p.position ?? '', stats: {} };
                    byId.set(key, entry);
                }
                for (const [field, value] of Object.entries(p)) {
                    if (IDENTITY_FIELDS.has(field))
                        continue;
                    // Nested objects are per-category breakdowns we do not flatten, and null means
                    // the stat does not apply to this player in this category.
                    if (value === null || typeof value === 'object')
                        continue;
                    entry.stats[`${prefix}_${field}`] = value;
                }
            }
        }
    }
    return [...byId.values()];
}
/** Both teams from a `statistics.json` payload, as `{ home, away }`. */
export function nflGamePlayerStats(statistics) {
    const root = statistics?.statistics ?? statistics;
    return {
        home: nflTeamPlayerStats(root?.home),
        away: nflTeamPlayerStats(root?.away),
    };
}
//# sourceMappingURL=nfl-player-stats.js.map