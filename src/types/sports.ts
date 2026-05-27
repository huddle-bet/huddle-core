// ─── Sport & League Classification ──────────────────────────────────────────

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
export type LiveProvider =
  | 'espn'
  | 'sportradar'
  | 'valve'
  | 'lolesports'
  | 'hltv'
  | 'vlr.gg'
  | 'breakingpoint'
  | 'blast';

/**
 * Vendors that publish schedule (upcoming fixtures). Multiple providers
 * can contribute schedule rows for the same sport — canonical_event_id
 * bridges them in the `events` table.
 */
export type ScheduleProvider =
  | LiveProvider
  | 'bo3gg'
  | 'dltv'
  | 'r6.ubisoft.com';

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
  nba:   { slug: 'nba',   name: 'NBA',                        type: 'traditional', shortName: 'NBA',   liveProvider: 'sportradar', scheduleProviders: ['sportradar', 'espn'] },
  nfl:   { slug: 'nfl',   name: 'NFL',                        type: 'traditional', shortName: 'NFL',   liveProvider: 'sportradar', scheduleProviders: ['sportradar', 'espn'] },
  nhl:   { slug: 'nhl',   name: 'NHL',                        type: 'traditional', shortName: 'NHL',   liveProvider: 'sportradar', scheduleProviders: ['sportradar', 'espn'] },
  mlb:   { slug: 'mlb',   name: 'MLB',                        type: 'traditional', shortName: 'MLB',   liveProvider: 'sportradar', scheduleProviders: ['sportradar', 'espn'] },
  // Esports
  lol:      { slug: 'lol',      name: 'League of Legends', type: 'esport', shortName: 'LoL',   liveProvider: 'lolesports', scheduleProviders: ['bo3gg', 'lolesports'] },
  cs2:      { slug: 'cs2',      name: 'Counter-Strike 2',  type: 'esport', shortName: 'CS2',   liveProvider: 'hltv', scheduleProviders: ['hltv'] },
  valorant: { slug: 'valorant', name: 'Valorant',          type: 'esport', shortName: 'VAL',   liveProvider: 'vlr.gg', scheduleProviders: ['vlr.gg'] },
  dota2:    { slug: 'dota2',    name: 'Dota 2',            type: 'esport', shortName: 'Dota2', liveProvider: 'valve', scheduleProviders: ['bo3gg'] },
  cod:      { slug: 'cod',      name: 'Call of Duty',      type: 'esport', shortName: 'CoD',   liveProvider: 'breakingpoint', scheduleProviders: ['breakingpoint'] },
  rl:       { slug: 'rl',       name: 'Rocket League',     type: 'esport', shortName: 'RL',    liveProvider: 'blast',         scheduleProviders: ['blast'] },
  // r6: live polling retired (siege.gg moved behind a Cloudflare managed
  // challenge; r6 is a low-volume sportsbook market). Schedule + post-game
  // per-round telemetry come from Ubisoft's official esports portal via
  // R6UbisoftBackfiller. Events transition scheduled → final without
  // intermediate live_state writes; huddle-live has no R6 live adapter.
  r6:       { slug: 'r6',       name: 'Rainbow Six Siege', type: 'esport', shortName: 'R6',                                   scheduleProviders: ['r6.ubisoft.com'] },
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
