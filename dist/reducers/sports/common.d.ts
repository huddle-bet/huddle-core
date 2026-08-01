import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
/**
 * Shared live-state shape for traditional sports. Each sport's reducer
 * produces one of these under `state.gameState`. Frontend contract —
 * additions here must ship with a corresponding client update.
 *
 * `period` is the numeric period (quarter/half/inning/etc). `periodLabel`
 * is the display string formatted per-sport (Q3, P2, T5, OT1). Numeric
 * reads go through `period`; display reads go through `periodLabel`.
 */
export interface BaseSportState {
    period: number;
    clock: string;
    possession: 'home' | 'away' | null;
    periodLabel: string;
    coverage: 'full' | 'partial';
}
export declare function createBaseSportState(): BaseSportState;
export type PeriodFormatter = (period: number) => string;
export interface SportReducerConfig {
    /** Maps numeric period (0 = pregame) to display label ('Q1', 'P2', 'T5', 'OT1'). */
    formatPeriod: PeriodFormatter;
    /** Feed text when status flips to 'live'. Sport-specific flavor ('Tip-off', 'Puck drop'). */
    startText?: string;
}
/**
 * Generic sport reducer. Takes one SportsLiveEvent, folds it into the
 * previous LiveStateRow, returns new state + any emitted feed entries.
 * Per-sport differences live in the config (period label formatter +
 * start-of-game flavor text).
 *
 * Provider-agnostic — identical behavior whether the upstream was ESPN
 * snapshot-diff or a Sportradar push stream.
 */
export declare function reduceSport(prev: LiveStateRow, evt: SportsLiveEvent, config: SportReducerConfig): ReducerResult;
/**
 * Provider-agnostic snapshot shape. Pull-based providers (ESPN) build one
 * of these per poll; the diff against the previous snapshot becomes a
 * SportsLiveEvent[] stream fed to a sport reducer.
 */
export interface SportsSnapshot {
    status: 'scheduled' | 'live' | 'final';
    homeScore: number;
    awayScore: number;
    period: string;
    clock: string;
    possession: 'home' | 'away' | null;
}
export interface SnapshotContext {
    eventId: string;
    leagueId: string;
    sourceId: string;
    sortIndex: number;
    occurredAt: string;
}
/**
 * Synthesize a SportsLiveEvent[] from two consecutive snapshots. First
 * call (prev=undefined) emits the current status + score + clock as
 * baseline events. Subsequent calls emit only on change.
 */
export declare function snapshotDiff(ctx: SnapshotContext, prev: SportsSnapshot | undefined, curr: SportsSnapshot): SportsLiveEvent[];
//# sourceMappingURL=common.d.ts.map