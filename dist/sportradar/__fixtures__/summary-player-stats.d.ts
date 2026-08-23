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
 *
 * ## The two extra NHL pairs, added 2026-08-23
 *
 * `Tyler Motte` and `Evan Rodrigues` come from a DIFFERENT game — `63c632c4` — and are here
 * because the original five cannot test what was added. Every one of them has
 * `powerplay.goals = 0` and `powerplay.assists = 0`, so they cannot distinguish reading the
 * block from defaulting it. That is the same hole the HBP fixture had, and the note in
 * `mlbBatterStats` says so; this time the fixture is fixed instead of the test working
 * around it.
 *
 * They discriminate in both directions:
 *
 *   Motte      total A 2, SOG 3   but PPA 1, PPSOG 0, ESA 1, ESSOG 3
 *   Rodrigues  PPG 3, PPA 1, PPP 4, PPSOG 6
 *
 * so an implementation that read `total` for the power-play keys fails on Motte, and one
 * that defaulted them to zero fails on Rodrigues.
 *
 * Their `expected` maps were read off the raw `statistics.{total,powerplay,shorthanded,
 * evenstrength}` blocks by hand, not produced by the code under test — the one property the
 * original provenance rule was protecting. `statistics.periods` is stripped: it is a
 * per-period repeat of the same blocks, nothing reads it, and it is 40 KB per player.
 */
export interface GoldenPair {
    player: string;
    statistics: unknown;
    expected: Record<string, string | number>;
}
export declare const SUMMARY_PLAYER_STATS: Record<"nba" | "nhl" | "mlb", GoldenPair[]>;
//# sourceMappingURL=summary-player-stats.d.ts.map