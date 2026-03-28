import type { Team, DataSource, ExternalId } from '../types/entities.js';
import type { Sport } from '../types/sports.js';
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
export declare class TeamRegistry {
    /** Canonical teams keyed by internal ID */
    private readonly teams;
    /** Lookup index: normalized name/alias → team ID */
    private readonly nameIndex;
    /** Lookup index: "{source}:{externalId}" → team ID */
    private readonly externalIndex;
    /** Register a canonical team */
    register(team: Team): void;
    /** Load an array of teams */
    loadTeams(teams: Team[]): void;
    /** Resolve a team by sport + any name variant */
    resolve(sport: Sport, name: string): Team | undefined;
    /** Resolve by external system ID. Sport-scoped to avoid cross-league collisions. */
    resolveByExternalId(source: DataSource, externalId: string, sport?: Sport): Team | undefined;
    /** Get a team by its canonical ID */
    get(id: string): Team | undefined;
    /** Get all teams for a sport */
    bySport(sport: Sport): Team[];
    /** Get all registered teams */
    all(): Team[];
    /** Fuzzy resolve — tries exact match first, then nickname (last word) */
    fuzzyResolve(sport: Sport, name: string): Team | undefined;
    /** Auto-register an unknown team (for college sports with 350+ teams) */
    autoRegister(sport: Sport, name: string): Team;
    private deterministicId;
    private key;
}
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
export declare function defineTeam(def: TeamDef): Team;
//# sourceMappingURL=team-registry.d.ts.map