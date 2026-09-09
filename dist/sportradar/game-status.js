import { assertKnownVariant } from '../unknown-variant.js';
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
    'flex-schedule',
    'time-tbd',
];
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
 * **`delayed`, `wdelay` and `fdelay` map to `delayed`, settled 2026-09-09 (ENG-614).** They
 * used to map to `live`, and this comment used to say the choice was unresolved: Sportradar
 * uses the values both for a game stopped mid-play (our `suspended`) and for one whose first
 * pitch has not happened (our `scheduled`), so picking either would replace one bug with its
 * mirror image. The way out was not a better guess. `EventStatus` gained a `delayed` member
 * that is neither, and this returns it.
 *
 * The observation that settled it: MLB Minnesota at Detroit, 2026-09-09. Sportradar served
 * `status: "wdelay"` on BOTH the daily schedule and the game summary at 16:53Z and 16:33Z,
 * for a 17:10Z first pitch, with `outcome.current_inning: 0` — a game that had not started.
 * Under the old mapping huddle-data's schedule poller wrote `events.status = 'live'` on it,
 * huddle-live never saw a play frame so there was no `live_state` row behind it, and the
 * client had no value to draw but LIVE.
 *
 * Unknown values warn once per process and fall back to `scheduled`. The fallback is
 * deliberate: a status Sportradar ships mid-season must not take a whole schedule poll down
 * over one fixture. What it must not do is pass silently, which is how this survived.
 */
export function mapSportradarStatus(status, opts) {
    if (!status)
        return 'scheduled';
    assertKnownVariant('sportradar.game_status', status, SPORTRADAR_GAME_STATUSES, {
        context: opts?.context,
        log: opts?.log,
    });
    switch (status) {
        case 'inprogress':
        case 'halftime':
            return 'live';
        // "Not playing right now, expected to resume", which is what `delayed` means and neither
        // `live` nor `scheduled` does. The three stay together: the payload does not separate a
        // late first pitch from a mid-play stoppage, so a mapping that separated them would be
        // claiming a distinction the provider never made.
        case 'delayed':
        case 'wdelay':
        case 'fdelay':
            return 'delayed';
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
        // An unsettled kickoff slot is still an unplayed game. Both already fell here via the
        // default arm, so this changes no behaviour — it makes the mapping intentional and stops
        // the guard reporting a value we have now seen and understood.
        case 'flex-schedule':
        case 'time-tbd':
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
export function isTerminalStatus(status) {
    return status === 'final' || status === 'cancelled';
}
//# sourceMappingURL=game-status.js.map