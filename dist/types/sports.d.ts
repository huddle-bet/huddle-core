export type SportType = 'traditional' | 'esport';
export type TraditionalSport = 'nba' | 'nfl' | 'nhl' | 'mlb';
export type EsportGame = 'lol' | 'cs2' | 'valorant' | 'dota2' | 'cod' | 'rl' | 'r6';
export type Sport = TraditionalSport | EsportGame;
/**
 * Vendors that push/pull live data. Each sport has at most one primary
 * live provider. The four traditional sports (NBA/NFL/NHL/MLB) run on
 * Sportradar — NFL via the Pulse push feed — with ESPN retained as
 * fallback. (Genius was retired in 2026-05; NFL moved to Sportradar and
 * the NCAA leagues it covered were descoped.)
 *
 * `breakingpoint`, `blast` are HTML-scraped sources. Unlike the push-based
 * providers they can't stream — huddle-live polls match detail pages during
 * the live window and emits diffs. They live here because they are the
 * authoritative live source for their sports; there's no richer feed to
 * fall back to for COD/RL.
 */
export type LiveProvider = 'espn' | 'sportradar' | 'valve' | 'lolesports' | 'hltv' | 'vlr.gg' | 'breakingpoint' | 'blast';
/**
 * Vendors that publish schedule (upcoming fixtures). Multiple providers
 * can contribute schedule rows for the same sport — canonical_event_id
 * bridges them in the `events` table.
 */
export type ScheduleProvider = LiveProvider | 'bo3gg' | 'dltv' | 'r6.ubisoft.com';
/**
 * Provider this service will use for live data once all gates (key,
 * entitlement, flag) are satisfied. `liveProvider` in SPORTS is the
 * default at launch; huddle-live can override via EventsWatcher when
 * a trial/contract flip justifies it.
 */
export interface SportConfig {
    slug: Sport;
    name: string;
    type: SportType;
    /** Display-friendly short name */
    shortName: string;
    /** Primary live-data vendor. `undefined` = no live coverage today. */
    liveProvider?: LiveProvider;
    /** Every vendor that writes scheduled/live rows into `events` for this sport. */
    scheduleProviders: readonly ScheduleProvider[];
}
export declare const SPORTS: Record<Sport, SportConfig>;
export declare function isSport(s: string): s is Sport;
/** Sports with any live coverage. Used by huddle-live's adapters. */
export declare function sportsWithLiveProvider(provider: LiveProvider): Sport[];
/** Sports fed by a particular schedule provider. Used by huddle-data. */
export declare function sportsWithScheduleProvider(provider: ScheduleProvider): Sport[];
/** All sports of a given type (traditional vs esport). */
export declare function sportsOfType(type: SportType): Sport[];
//# sourceMappingURL=sports.d.ts.map