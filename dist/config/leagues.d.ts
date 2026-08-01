import type { Sport } from '../types/sports.js';
/**
 * Every vendor that can own a league's live or schedule data. Keep in sync
 * with LiveProvider + ScheduleProvider in ../types/sports.ts.
 */
export type Provider = 'espn' | 'sportradar' | 'valve' | 'lolesports' | 'hltv' | 'vlr.gg' | 'bo3gg' | 'dltv' | 'breakingpoint' | 'blast' | 'r6.ubisoft.com';
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
 * **Sportradar is the sole provider for NBA, NFL, NHL and MLB.** ESPN was their
 * fallback and was removed 2026-08-01: it is a scraped public source and Sportradar
 * is the paid, contractual one, so falling back silently swapped an official feed for
 * an unofficial one at the moment reliability mattered most.
 *
 * It was also not carrying its weight. Measured before removal: ESPN contributed 0 of
 * 39,489 NFL player rows, and Sportradar held more rows and equal recency in all four.
 * On schedule coverage, once the season endpoints were wired (huddle-data#12):
 *
 *   nfl   sportradar 322 upcoming   espn 7
 *   nhl   sportradar 1409           espn 0
 *   mlb   sportradar 778            espn 53
 *   nba   both 0 — the 2026-27 schedule is unpublished until mid-August
 *
 * `fallback: null` means an outage now takes the sport dark rather than quietly
 * degrading to a scraper. That is the intended trade: a visible outage is preferable
 * to unofficial data presented as official.
 */
export declare const LEAGUE_PROVIDERS: Record<Sport, LeagueProviderConfig>;
/**
 * True when credentials for a given provider+sport are present in env.
 * Scraper-based sources (espn, bo3gg, dltv, breakingpoint, blast) need no
 * keys and always return true.
 *
 * Env conventions match existing huddle-live/huddle-data code:
 *   sportradar → SPORTRADAR_API_KEY + per-league SPORTRADAR_<LEAGUE>=1
 */
export declare function isProviderEnabled(provider: Provider, sport: Sport, env?: NodeJS.ProcessEnv): boolean;
/**
 * Returns the provider that should own `sport` right now. Picks primary if
 * its env is healthy, falls through to `fallback` otherwise. Returns the
 * primary as a last resort so callers always get a concrete provider name
 * (they should log + skip if that provider also lacks coverage).
 */
export declare function resolveProvider(sport: Sport, env?: NodeJS.ProcessEnv): Provider;
/** Sports currently resolving to the given provider (after env resolution). */
export declare function sportsOwnedBy(provider: Provider, env?: NodeJS.ProcessEnv): Sport[];
//# sourceMappingURL=leagues.d.ts.map