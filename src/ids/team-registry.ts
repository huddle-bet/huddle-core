import type { Team, DataSource, ExternalId } from '../types/entities.js';
import type { Sport } from '../types/sports.js';
import { normalizeTeamName } from './normalize.js';

/**
 * In-memory team registry that resolves any source-specific name or ID
 * to a canonical Team entity.
 *
 * Usage:
 *   const reg = new TeamRegistry();
 *   reg.loadTeams(NBA_TEAMS);  // Load canonical data
 *   const team = reg.resolve('nba', 'CHA Hornets');  // DraftKings name
 *   const same = reg.resolve('nba', 'Charlotte Hornets');  // ESPN name
 *   team.id === same.id  // true — both resolve to same UUID
 */
export class TeamRegistry {
  /** Canonical teams keyed by internal ID */
  private readonly teams = new Map<string, Team>();
  /** Lookup index: normalized name/alias → team ID */
  private readonly nameIndex = new Map<string, string>();
  /** Lookup index: "{source}:{externalId}" → team ID */
  private readonly externalIndex = new Map<string, string>();

  /** Register a canonical team */
  register(team: Team): void {
    this.teams.set(team.id, team);

    // Index canonical name
    this.nameIndex.set(this.key(team.sport, team.name), team.id);
    this.nameIndex.set(this.key(team.sport, team.shortName), team.id);
    this.nameIndex.set(this.key(team.sport, team.abbreviation), team.id);

    // Index aliases
    for (const alias of team.aliases) {
      this.nameIndex.set(this.key(team.sport, alias), team.id);
    }

    // Index external IDs (scoped by sport to avoid cross-league ID collisions)
    for (const ext of team.externalIds) {
      this.externalIndex.set(`${team.sport}:${ext.source}:${ext.id}`, team.id);
      // Also keep unscoped for backwards compat (last write wins)
      this.externalIndex.set(`${ext.source}:${ext.id}`, team.id);
    }
  }

  /** Load an array of teams */
  loadTeams(teams: Team[]): void {
    for (const team of teams) this.register(team);
  }

  /** Resolve a team by sport + any name variant */
  resolve(sport: Sport, name: string): Team | undefined {
    const normalized = this.key(sport, name);
    const id = this.nameIndex.get(normalized);
    return id ? this.teams.get(id) : undefined;
  }

  /** Resolve by external system ID. Sport-scoped to avoid cross-league collisions. */
  resolveByExternalId(source: DataSource, externalId: string, sport?: Sport): Team | undefined {
    // Try sport-scoped first (precise)
    if (sport) {
      const scopedId = this.externalIndex.get(`${sport}:${source}:${externalId}`);
      if (scopedId) return this.teams.get(scopedId);
    }
    // Fallback to unscoped (may collide across sports)
    const id = this.externalIndex.get(`${source}:${externalId}`);
    return id ? this.teams.get(id) : undefined;
  }

  /** Get a team by its canonical ID */
  get(id: string): Team | undefined {
    return this.teams.get(id);
  }

  /** Get all teams for a sport */
  bySport(sport: Sport): Team[] {
    return [...this.teams.values()].filter((t) => t.sport === sport);
  }

  /** Get all registered teams */
  all(): Team[] {
    return [...this.teams.values()];
  }

  /** Fuzzy resolve — tries exact match first, then nickname (last word) */
  fuzzyResolve(sport: Sport, name: string): Team | undefined {
    // Exact
    const exact = this.resolve(sport, name);
    if (exact) return exact;

    // Try nickname (last word)
    const words = normalizeTeamName(name).split(' ');
    if (words.length > 1) {
      const nickname = words[words.length - 1];
      const byNickname = this.resolve(sport, nickname);
      if (byNickname) return byNickname;
    }

    // Try matching against all teams in the sport
    const normalized = normalizeTeamName(name);
    for (const team of this.bySport(sport)) {
      const teamNorm = normalizeTeamName(team.shortName);
      if (normalized.includes(teamNorm) || teamNorm.includes(normalized)) {
        return team;
      }
    }

    return undefined;
  }

  private key(sport: Sport, name: string): string {
    return `${sport}:${normalizeTeamName(name)}`;
  }
}

// ─── Helper to build Team objects ───────────────────────────────────────────

export interface TeamDef {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  sport: Sport;
  region?: string;
  aliases?: string[];
  externalIds?: ExternalId[];
}

export function defineTeam(def: TeamDef): Team {
  return {
    id: def.id,
    name: def.name,
    shortName: def.shortName,
    abbreviation: def.abbreviation,
    sport: def.sport,
    region: def.region,
    externalIds: def.externalIds ?? [],
    aliases: def.aliases ?? [],
  };
}
