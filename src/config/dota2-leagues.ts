/**
 * Curated allowlist of Valve league_ids Huddle cares about for Dota 2.
 *
 * Scope: tier-1 professional events with real betting market coverage
 * (Majors, ESL Pro Tour, DreamLeague Division 1, PGL, BLAST Slam). Tier-2
 * and below generally don't get lines and aren't worth ingesting.
 *
 * Consumed by:
 *   - `backfill-dota2-history` CLI — manual historical hydration, walks
 *     GetMatchHistory per league_id.
 *   - future scoping in `ValveDotaReconciler` if we ever need to drop
 *     noise from Valve's unfiltered GetLiveLeagueGames feed.
 *
 * Valve retired `GetLeagueListing` so we maintain this ourselves. Adding
 * a league is one entry here — no code change elsewhere.
 */
export interface Dota2LeagueSpec {
  /** Valve league_id (integer). Look up by running a GetLiveLeagueGames
   *  call during the event and copying `result.games[].league_id`. */
  id: number;
  /** Human-readable tournament name for logs. Does not need to match
   *  any upstream field exactly. */
  name: string;
}

export const DOTA2_PRO_LEAGUES: Dota2LeagueSpec[] = [
  { id: 19543, name: 'PGL Wallachia 2026 Season 8' },
  { id: 19532, name: 'DreamLeague Division 2 Season 4' },
  { id: 19575, name: 'ESL Challenger China' },
  { id: 18866, name: 'European Pro League 2025-2026 Season' },
  { id: 18865, name: 'EPL World Series: Southeast Asia 2025-2026 Season' },
];

/** Fast membership check by league_id. */
export const DOTA2_PRO_LEAGUE_IDS: ReadonlySet<number> = new Set(
  DOTA2_PRO_LEAGUES.map((l) => l.id),
);
