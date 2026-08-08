import type { EventStatus } from '../types/events.js';
import { assertKnownVariant } from '../unknown-variant.js';

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
export type SportradarGameStatus =
  | 'scheduled'
  | 'created'
  | 'inprogress'
  | 'halftime'
  | 'delayed'
  // MLB-only in-play delays: weather and field. They never appear in a schedule payload —
  // measured across 5,308 games of MLB/NBA/NHL/NFL schedule, which returned only closed,
  // scheduled, inprogress, postponed and unnecessary — but huddle-live's MLB translators
  // have carried them since they were written, which is the evidence that the live feed
  // emits them. Dropping them would regress a delayed game from `live` to `scheduled`.
  | 'wdelay'
  | 'fdelay'
  // A game started and stopped that may resume. MLB suspends games; the others effectively
  // do not.
  | 'suspended'
  | 'complete'
  | 'closed'
  | 'canceled'
  | 'postponed'
  | 'if_necessary'
  | 'unnecessary';

/** Every wire value the mapper claims to understand. Anything else warns, once. */
export const SPORTRADAR_GAME_STATUSES = [
  'scheduled',
  'created',
  'inprogress',
  'halftime',
  'delayed',
  'wdelay',
  'fdelay',
  'suspended',
  'complete',
  'closed',
  'canceled',
  'postponed',
  'if_necessary',
  'unnecessary',
] as const satisfies readonly SportradarGameStatus[];

/** As above, for `SPORTRADAR_GAME_STATUSES` — adding to the union must add to the array. */
type Assert<T extends true> = T;
type _SportradarStatusesAreExhaustive = Assert<
  [SportradarGameStatus] extends [(typeof SPORTRADAR_GAME_STATUSES)[number]] ? true : false
>;

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
export function mapSportradarStatus(
  status: string | undefined | null,
  opts?: MapSportradarStatusOptions,
): EventStatus {
  if (!status) return 'scheduled';

  assertKnownVariant('sportradar.game_status', status, SPORTRADAR_GAME_STATUSES as readonly string[], {
    context: opts?.context,
    log: opts?.log,
  });

  switch (status) {
    case 'inprogress':
    case 'halftime':
      return 'live';

    // `delayed`, `wdelay` and `fdelay` all mean "not playing right now, expected to resume".
    // They map to `live` because that is what every huddle-live translator has always done,
    // and changing it silently would be a behaviour change smuggled inside a refactor. It is
    // also not obviously right — see the note above about `delayed` being unresolved. The
    // three are kept together so whatever settles one settles all of them.
    case 'delayed':
    case 'wdelay':
    case 'fdelay':
      return 'live';

    case 'suspended':
      return 'suspended';

    case 'complete':
    case 'closed':
      return 'final';

    case 'canceled':
      return 'cancelled';

    case 'postponed':
      return 'postponed';

    // Playoff placeholders — a game 7 that may never be needed. Unplayed, not cancelled.
    case 'scheduled':
    case 'created':
    case 'if_necessary':
    case 'unnecessary':
      return 'scheduled';

    default:
      return 'scheduled';
  }
}

/**
 * True when a status means the fixture is over and will not resume — the event's lifecycle
 * has ended, whether it was played out or called off.
 *
 * Live adapters use this to decide when to stop polling a game and release it. Before this,
 * they tested `FINAL_STATUSES.has(s)`, which conflated "finished" with "final" and so could
 * not release a cancelled game at all: it stayed in the active set until a stale sweep
 * eventually marked it `final`, which is the wrong answer written by the wrong mechanism.
 */
export function isTerminalStatus(status: EventStatus): boolean {
  return status === 'final' || status === 'cancelled';
}
