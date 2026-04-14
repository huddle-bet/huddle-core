// ─── Sport & League Classification ──────────────────────────────────────────

export type SportType = 'traditional' | 'esport';

export type TraditionalSport = 'nba' | 'nfl' | 'nhl' | 'mlb' | 'ncaam' | 'ncaaf';
export type EsportGame = 'lol' | 'cs2' | 'valorant' | 'dota2' | 'cod' | 'rl';
export type Sport = TraditionalSport | EsportGame;

/**
 * Vendors that push/pull live data. Each sport has at most one primary
 * live provider; when Sportradar ships, the traditional sports flip from
 * 'espn' to 'sportradar' here and huddle-live follows the config.
 */
export type LiveProvider = 'gsk' | 'espn' | 'sportradar' | 'genius';

/**
 * Vendors that publish schedule (upcoming fixtures). Multiple providers
 * can contribute schedule rows for the same sport — canonical_event_id
 * bridges them in the `events` table.
 */
export type ScheduleProvider =
  | LiveProvider
  | 'bo3gg'
  | 'dltv'
  | 'vlr.gg'
  | 'blast'
  | 'breakingpoint';

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

export const SPORTS: Record<Sport, SportConfig> = {
  // Traditional
  nba:   { slug: 'nba',   name: 'NBA',                        type: 'traditional', shortName: 'NBA',   liveProvider: 'espn', scheduleProviders: ['espn'] },
  nfl:   { slug: 'nfl',   name: 'NFL',                        type: 'traditional', shortName: 'NFL',   liveProvider: 'espn', scheduleProviders: ['espn'] },
  nhl:   { slug: 'nhl',   name: 'NHL',                        type: 'traditional', shortName: 'NHL',   liveProvider: 'espn', scheduleProviders: ['espn'] },
  mlb:   { slug: 'mlb',   name: 'MLB',                        type: 'traditional', shortName: 'MLB',   liveProvider: 'espn', scheduleProviders: ['espn'] },
  ncaam: { slug: 'ncaam', name: "NCAA Men's Basketball",       type: 'traditional', shortName: 'NCAAM', liveProvider: 'espn', scheduleProviders: ['espn'] },
  ncaaf: { slug: 'ncaaf', name: 'NCAA Football',               type: 'traditional', shortName: 'NCAAF', liveProvider: 'espn', scheduleProviders: ['espn'] },
  // Esports
  lol:      { slug: 'lol',      name: 'League of Legends', type: 'esport', shortName: 'LoL',   liveProvider: 'gsk', scheduleProviders: ['bo3gg', 'gsk'] },
  cs2:      { slug: 'cs2',      name: 'Counter-Strike 2',  type: 'esport', shortName: 'CS2',   liveProvider: 'gsk', scheduleProviders: ['bo3gg', 'gsk'] },
  valorant: { slug: 'valorant', name: 'Valorant',          type: 'esport', shortName: 'VAL',   liveProvider: 'gsk', scheduleProviders: ['vlr.gg', 'gsk'] },
  dota2:    { slug: 'dota2',    name: 'Dota 2',            type: 'esport', shortName: 'Dota2', liveProvider: 'gsk', scheduleProviders: ['dltv', 'gsk'] },
  cod:      { slug: 'cod',      name: 'Call of Duty',      type: 'esport', shortName: 'CoD',                         scheduleProviders: ['breakingpoint'] },
  rl:       { slug: 'rl',       name: 'Rocket League',     type: 'esport', shortName: 'RL',                          scheduleProviders: ['blast'] },
};

export function isSport(s: string): s is Sport {
  return s in SPORTS;
}

/** Sports with any live coverage. Used by huddle-live's adapters. */
export function sportsWithLiveProvider(provider: LiveProvider): Sport[] {
  return (Object.values(SPORTS) as SportConfig[])
    .filter((s) => s.liveProvider === provider)
    .map((s) => s.slug);
}

/** Sports fed by a particular schedule provider. Used by huddle-data. */
export function sportsWithScheduleProvider(provider: ScheduleProvider): Sport[] {
  return (Object.values(SPORTS) as SportConfig[])
    .filter((s) => s.scheduleProviders.includes(provider))
    .map((s) => s.slug);
}

/** All sports of a given type (traditional vs esport). */
export function sportsOfType(type: SportType): Sport[] {
  return (Object.values(SPORTS) as SportConfig[])
    .filter((s) => s.type === type)
    .map((s) => s.slug);
}
