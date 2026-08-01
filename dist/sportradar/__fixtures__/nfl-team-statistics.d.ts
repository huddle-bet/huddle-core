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
export declare const NFL_EXPECTED_PLAYERS: NflGoldenPlayer[];
//# sourceMappingURL=nfl-team-statistics.d.ts.map