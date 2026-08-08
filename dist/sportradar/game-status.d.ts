import type { EventStatus } from '../types/events.js';
/**
 * Sportradar's game-status vocabulary, spelled exactly as it arrives on the wire.
 *
 * **`canceled` has one L.** Both huddle-data and huddle-live independently declared it with
 * two — our spelling, not Sportradar's — which made every `case 'cancelled':` and every
 * `FINAL_STATUSES.has('cancelled')` unreachable. TypeScript was satisfied, because the local
 * union carried the same misspelling, so the real value fell through to whatever the default
 * arm did. Nine copies of the same dead branch across two repos.
 *
 * Verified against the live API on 2026-08-08:
 *
 * ```
 * GET games/2026/03/15/schedule.json   ->  {"closed":16,"canceled":1}
 * GET games/c522e6ef…/summary.json     ->  status=canceled
 * ```
 *
 * Do not "correct" this to the British spelling. `mapSportradarStatus` is the one place the
 * two spellings are allowed to meet.
 */
export type SportradarGameStatus = 'scheduled' | 'created' | 'inprogress' | 'halftime' | 'delayed' | 'wdelay' | 'fdelay' | 'suspended' | 'complete' | 'closed' | 'canceled' | 'postponed' | 'if_necessary' | 'unnecessary' | 'flex-schedule' | 'time-tbd';
/** Every wire value the mapper claims to understand. Anything else warns, once. */
export declare const SPORTRADAR_GAME_STATUSES: readonly ["scheduled", "created", "inprogress", "halftime", "delayed", "wdelay", "fdelay", "suspended", "complete", "closed", "canceled", "postponed", "if_necessary", "unnecessary", "flex-schedule", "time-tbd"];
export interface MapSportradarStatusOptions {
    /** Where the value came from, for triage — `{ sport: 'mlb', gameId }`. */
    context?: Record<string, unknown>;
    /** Route the unknown-variant warning somewhere other than `console.warn`. */
    log?: (message: string) => void;
}
/**
 * Map a Sportradar game status onto our canonical `EventStatus`.
 *
 * This exists because the mapping was duplicated nine times — once in huddle-data's schedule
 * poller and once per sport per direction in huddle-live (`translate.ts` and
 * `push-translate.ts` for mlb/nba/nfl/nhl) — and every copy carried the same two bugs. A
 * mapping that every service must agree on belongs here, next to `EventStatus` itself.
 *
 * What the previous copies got wrong, and what this fixes:
 *
 * - `canceled` was unreachable (see the type above) and fell through to the default arm,
 *   which meant a cancelled game was stored as `final` in one path and `scheduled` in
 *   another. Three cancelled MLB fixtures sat in `events` as completed games — 0-0, no
 *   play-by-play — and were found only as the residue when every *played* game filled in.
 * - `postponed` had no case at all and became `scheduled`, keeping its original start time.
 * - `if_necessary` / `unnecessary` also became `scheduled`. That one is correct, but by
 *   accident rather than intent, so it is written down here.
 *
 * **`delayed` maps to `live` and that is not settled.** Sportradar uses it both for a game
 * stopped mid-play (our `suspended`) and one whose first pitch has not happened (our
 * `scheduled`), and the payload does not distinguish them. Choosing either without observing
 * a real delayed game would replace one bug with its mirror image. Current behaviour is
 * pinned by a test so a change is a decision rather than a drift — ENG-521.
 *
 * Unknown values warn once per process and fall back to `scheduled`. The fallback is
 * deliberate: a status Sportradar ships mid-season must not take a whole schedule poll down
 * over one fixture. What it must not do is pass silently, which is how this survived.
 */
export declare function mapSportradarStatus(status: string | undefined | null, opts?: MapSportradarStatusOptions): EventStatus;
/**
 * True when a status means the fixture is over and will not resume — the event's lifecycle
 * has ended, whether it was played out or called off.
 *
 * Live adapters use this to decide when to stop polling a game and release it. Before this,
 * they tested `FINAL_STATUSES.has(s)`, which conflated "finished" with "final" and so could
 * not release a cancelled game at all: it stayed in the active set until a stale sweep
 * eventually marked it `final`, which is the wrong answer written by the wrong mechanism.
 */
export declare function isTerminalStatus(status: EventStatus): boolean;
//# sourceMappingURL=game-status.d.ts.map