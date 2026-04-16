import type { Sport } from '../types/sports.js';

/**
 * Every vendor that can own a league's live or schedule data. Keep in sync
 * with LiveProvider + ScheduleProvider in ../types/sports.ts.
 */
export type Provider =
  | 'espn'
  | 'sportradar'
  | 'genius'
  | 'gsk'
  | 'bo3gg'
  | 'dltv'
  | 'breakingpoint'
  | 'blast';

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
 * Paid APIs (sportradar, genius, gsk) fall back to public sources (espn,
 * bo3gg, dltv) while keys are being provisioned. cod/rl run their sole
 * scraper as primary — no fallback path exists today.
 */
export const LEAGUE_PROVIDERS: Record<Sport, LeagueProviderConfig> = {
  nba:   { primary: 'sportradar', fallback: 'espn' },
  // NFL: Genius holds exclusive official-data rights through 2027.
  nfl:   { primary: 'genius',     fallback: 'espn' },
  nhl:   { primary: 'sportradar', fallback: 'espn' },
  mlb:   { primary: 'sportradar', fallback: 'espn' },
  ncaam: { primary: 'genius',     fallback: 'espn' },
  ncaaf: { primary: 'genius',     fallback: 'espn' },
  cs2:      { primary: 'gsk', fallback: 'bo3gg' },
  valorant: { primary: 'gsk', fallback: 'bo3gg' },
  lol:      { primary: 'gsk', fallback: 'bo3gg' },
  dota2:    { primary: 'gsk', fallback: 'dltv'  },
  cod: { primary: 'breakingpoint', fallback: null },
  rl:  { primary: 'blast',         fallback: null },
};

/**
 * True when credentials for a given provider+sport are present in env.
 * Scraper-based sources (espn, bo3gg, dltv, breakingpoint, blast) need no
 * keys and always return true.
 *
 * Env conventions match existing huddle-live/huddle-data code:
 *   sportradar → SPORTRADAR_API_KEY + per-league SPORTRADAR_<LEAGUE>=1
 *   genius     → GENIUS_API_KEY/CLIENT_ID/CLIENT_SECRET + GENIUS_<LEAGUE>=1
 *   gsk        → GSK_TOKEN
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
    case 'breakingpoint':
    case 'blast':
      return true;
    case 'sportradar':
      return Boolean(env.SPORTRADAR_API_KEY)
        && env[`SPORTRADAR_${sport.toUpperCase()}`] === '1';
    case 'genius':
      return Boolean(env.GENIUS_API_KEY && env.GENIUS_CLIENT_ID && env.GENIUS_CLIENT_SECRET)
        && env[`GENIUS_${sport.toUpperCase()}`] === '1';
    case 'gsk':
      return Boolean(env.GSK_TOKEN);
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
