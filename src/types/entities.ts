import type { Sport } from './sports.js';

// ─── Data Sources ───────────────────────────────────────────────────────────

/** Every upstream system that provides data */
export type DataSource =
  // Match data
  | 'espn'
  | 'gol.gg'
  | 'bo3gg'
  | 'vlr.gg'
  | 'dltv'
  | 'bp.gg'
  | 'blast'
  | 'hltv'
  | 'breakingpoint'
  | 'blast.tv'
  // Odds
  | 'draftkings'
  | 'fanduel'
  | 'betmgm'
  | 'prizepicks'
  | 'underdog'
  | 'pick6';

// ─── External ID ────────────────────────────────────────────────────────────

/**
 * A reference to an entity in an external system.
 * Every team/player/event can have multiple external IDs — one per source.
 */
export interface ExternalId {
  source: DataSource;
  id: string;
}

// ─── Team ───────────────────────────────────────────────────────────────────

/**
 * Canonical team identity. One per real-world team.
 * Linked to every source via `externalIds`.
 */
export interface Team {
  /** UUID — stable for pre-defined teams, generated for auto-discovered */
  id: string;
  /** Canonical full name: "Los Angeles Lakers" */
  name: string;
  /** Short name / nickname: "Lakers" */
  shortName: string;
  /** Standard abbreviation: "LAL" */
  abbreviation: string;
  /** Sport this team competes in */
  sport: Sport;
  /** Region/conference (optional) */
  region?: string;
  /** IDs in external systems */
  externalIds: ExternalId[];
  /** Alternate names used by various sources */
  aliases: string[];
}

// ─── Player ─────────────────────────────────────────────────────────────────

/**
 * A dated team affiliation for a player.
 * The `from` date is when we first saw the player on this team.
 */
export interface TeamStint {
  teamId: string;
  /** ISO date when this affiliation was first observed */
  from: string;
  /** ISO date when this affiliation ended (player moved to another team). Undefined = current. */
  until?: string;
}

/**
 * Canonical player identity. One per real-world person.
 *
 * Team history is tracked as a timeline of stints so you can answer both:
 * - "What team is Harden on right now?" → latest stint
 * - "What team was Harden on March 5th?" → lookup by date
 */
export interface Player {
  /** UUID — generated via crypto.randomUUID() */
  id: string;
  /** Display name: "LeBron James" */
  name: string;
  /** Gamertag / in-game name (esports): "s1mple" */
  gamertag?: string;
  /** Sport this player competes in */
  sport: Sport;
  /**
   * Team history ordered chronologically. Last entry with no `until` is the current team.
   * Built automatically as games are ingested — when a player appears on a different
   * team than their latest stint, a new stint is created.
   */
  teamHistory: TeamStint[];
  /** Position: "PG", "C", "AWP", "Mid" */
  position?: string;
  /** IDs in external systems */
  externalIds: ExternalId[];
  /** Alternate names / spellings used by various sources */
  aliases: string[];
}

// ─── Event ──────────────────────────────────────────────────────────────────

/**
 * Canonical event/match identity. Links a real-world match across all sources.
 */
export interface GameEvent {
  /** Stable internal ID: "{sport}:event:{date}:{team1-vs-team2}" */
  id: string;
  sport: Sport;
  date: string;
  /** Canonical team IDs */
  teamIds: [string, string];
  /** IDs in external systems (ESPN event, DK event, etc.) */
  externalIds: ExternalId[];
}
