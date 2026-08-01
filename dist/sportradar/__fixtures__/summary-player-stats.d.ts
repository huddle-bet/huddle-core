/**
 * Golden fixtures for the Sportradar player-stat flatteners.
 *
 * Captured 2026-08-01 from real `summary.json` payloads, one completed game per sport.
 * Each `expected` value is the output of huddle-data's shipped normalizer run on that
 * same payload — see the test for why that provenance matters.
 *
 * A `.ts` module rather than a `.json` file read at runtime. CI builds `dist/` before
 * running vitest, so the compiled copy of the test executes too, and from there a path
 * relative to `import.meta.dirname` points into `dist/` — where tsc never copies JSON.
 * The first version of this passed locally and failed in CI for exactly that reason.
 */
export interface GoldenPair {
    player: string;
    statistics: unknown;
    expected: Record<string, string | number>;
}
export declare const SUMMARY_PLAYER_STATS: Record<"nba" | "nhl" | "mlb", GoldenPair[]>;
//# sourceMappingURL=summary-player-stats.d.ts.map