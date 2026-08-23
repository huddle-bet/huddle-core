/**
 * Golden fixture for the NFL team-level flattener.
 *
 * Captured 2026-08-01 from a real `statistics.json` payload (Seahawks @ Patriots).
 * `expected` is the output of huddle-data's shipped `normalizeNflGame` run on that
 * same payload — not hand-written and not derived from this implementation. See the
 * test for why that provenance is the whole point.
 */
export interface NflGoldenPlayer {
    name: string;
    athleteId?: string;
    position?: string;
    starter?: boolean;
    stats: Record<string, string | number>;
}
export declare const NFL_TEAM_STATISTICS: unknown;
/**
 * Regenerated 2026-08-23 from huddle-data's `normalizeNflGame` after both flatteners were
 * taught to descend into `extra_points`, which nests one level deeper as
 * `{ kicks: {players[]}, conversions: {players[]} }` and was therefore skipped in silence by
 * a `group.players` read. Provenance is unchanged and is the whole point: this is still
 * huddle-data's output, not this implementation's.
 *
 * Three players gain keys — Andy Borregales (`extra_points_kicks_*`), Drake Maye and Hunter
 * Henry (`extra_points_conversions_*`). Player count is unchanged at 35 on this payload
 * because all three also appear in other categories; the rows that were being LOST entirely
 * are players who appear only under extra points, which is why the fix is about presence and
 * not only about keys.
 */
export declare const NFL_EXPECTED_PLAYERS: NflGoldenPlayer[];
//# sourceMappingURL=nfl-team-statistics.d.ts.map