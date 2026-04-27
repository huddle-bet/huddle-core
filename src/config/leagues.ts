import type { Sport } from '../types/sports.js';

/**
 * Every vendor that can own a league's live or schedule data. Keep in sync
 * with LiveProvider + ScheduleProvider in ../types/sports.ts.
 */
export type Provider =
  | 'espn'
  | 'sportradar'
  | 'genius'
  | 'valve'
  | 'lolesports'
  | 'hltv'
  | 'vlr.gg'
  | 'bo3gg'
  | 'dltv'
  | 'breakingpoint'
  | 'blast'
  | 'siege.gg';

export interface LeagueProviderConfig {
  /** Preferred source when its credentials are present. */
  primary: Provider;
  /** Falls through here when primary is unavailable. null = no fallback. */
  fallback: Provider | null;
}

/**
 * Single source of truth for league → provider routing. Consumers:
 *   - huddle-data schedule: which scraper/API to call per sport
 *   - huddle-engine reader: which source_id to filter events by
 *   - huddle-live watcher: which adapter to spin up per event
 *   - huddle-api data-players: which source_id joins player_game_stats
 *
 * Paid APIs (sportradar, genius) fall back to public sources (espn) while
 * keys are being provisioned. cod/rl run their sole scraper as primary —
 * no fallback path exists today.
 */
export const LEAGUE_PROVIDERS: Record<Sport, LeagueProviderConfig> = {
  nba:   { primary: 'sportradar', fallback: 'espn' },
  // NFL: Genius holds exclusive official-data rights through 2027.
  nfl:   { primary: 'genius',     fallback: 'espn' },
  nhl:   { primary: 'sportradar', fallback: 'espn' },
  mlb:   { primary: 'sportradar', fallback: 'espn' },
  ncaam: { primary: 'genius',     fallback: 'espn' },
  ncaaf: { primary: 'genius',     fallback: 'espn' },
  // CS2 runs on HLTV scorebot via FlareSolverr. No fallback — if HLTV is
  // unavailable, CS2 live goes dark and the schedule/reconcile paths
  // surface the outage. See SPEC-ESPORTS-CS2.md.
  cs2:      { primary: 'hltv', fallback: null },
  // Valorant runs on vlr.gg end-to-end (schedule + live + stats). No
  // fallback — if vlr.gg blocks us or rolls layout, Valorant goes dark
  // and we patch. See SPEC-ESPORTS-VAL.md.
  valorant: { primary: 'vlr.gg', fallback: null },
  // LoL runs on Riot's own lolesports feed end-to-end.
  lol:      { primary: 'lolesports', fallback: null },
  // Dota 2 runs on Valve's own WebAPI. dltv stays available as a schedule
  // backfill source (no upcoming endpoint on Valve) but not a live fallback.
  dota2:    { primary: 'valve', fallback: null },
  cod: { primary: 'breakingpoint', fallback: null },
  rl:  { primary: 'blast',         fallback: null },
  // R6: siege.gg is the community-standard schedule source. HTML-scraped,
  // no API key. No fallback today — ubi's official "R6 Share" API is not
  // public.
  r6:  { primary: 'siege.gg',      fallback: null },
};

/**
 * True when credentials for a given provider+sport are present in env.
 * Scraper-based sources (espn, bo3gg, dltv, breakingpoint, blast) need no
 * keys and always return true.
 *
 * Env conventions match existing huddle-live/huddle-data code:
 *   sportradar → SPORTRADAR_API_KEY + per-league SPORTRADAR_<LEAGUE>=1
 *   genius     → GENIUS_API_KEY/CLIENT_ID/CLIENT_SECRET + GENIUS_<LEAGUE>=1
 */
export function isProviderEnabled(
  provider: Provider,
  sport: Sport,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  switch (provider) {
    case 'espn':
    case 'bo3gg':
    case 'dltv':
    case 'vlr.gg':
    case 'breakingpoint':
    case 'blast':
    case 'siege.gg':
      return true;
    case 'sportradar':
      return Boolean(env.SPORTRADAR_API_KEY)
        && env[`SPORTRADAR_${sport.toUpperCase()}`] === '1';
    case 'genius':
      return Boolean(env.GENIUS_API_KEY && env.GENIUS_CLIENT_ID && env.GENIUS_CLIENT_SECRET)
        && env[`GENIUS_${sport.toUpperCase()}`] === '1';
    case 'valve':
      // Free Steam WebAPI key(s) — supports single STEAM_API_KEY or
      // comma-separated STEAM_API_KEYS for the multi-key round-robin pool.
      return Boolean(env.STEAM_API_KEY || env.STEAM_API_KEYS);
    case 'lolesports':
      // Riot's lolesports feed uses a public static x-api-key scraped
      // from the lolesports.com JS bundle. No env auth required.
      return env.LOLESPORTS_ENABLED !== '0';
    case 'hltv':
      // HLTV ingest is always-on — the polling scorebot uses cycletls
      // (bundled) + the residential proxy in FLARESOLVERR_PROXY_URL. The
      // only thing that still needs FlareSolverr is huddle-data's /stats
      // backfill, which is gated independently inside huddle-data and
      // doesn't determine whether we surface live cs2 events.
      return true;
  }
}

/**
 * Returns the provider that should own `sport` right now. Picks primary if
 * its env is healthy, falls through to `fallback` otherwise. Returns the
 * primary as a last resort so callers always get a concrete provider name
 * (they should log + skip if that provider also lacks coverage).
 */
export function resolveProvider(
  sport: Sport,
  env: NodeJS.ProcessEnv = process.env,
): Provider {
  const config = LEAGUE_PROVIDERS[sport];
  if (isProviderEnabled(config.primary, sport, env)) return config.primary;
  if (config.fallback && isProviderEnabled(config.fallback, sport, env)) return config.fallback;
  return config.primary;
}

/** Sports currently resolving to the given provider (after env resolution). */
export function sportsOwnedBy(
  provider: Provider,
  env: NodeJS.ProcessEnv = process.env,
): Sport[] {
  return (Object.keys(LEAGUE_PROVIDERS) as Sport[]).filter(
    (s) => resolveProvider(s, env) === provider,
  );
}
