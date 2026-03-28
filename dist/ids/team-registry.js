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
    teams = new Map();
    /** Lookup index: normalized name/alias → team ID */
    nameIndex = new Map();
    /** Lookup index: "{source}:{externalId}" → team ID */
    externalIndex = new Map();
    /** Register a canonical team */
    register(team) {
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
    loadTeams(teams) {
        for (const team of teams)
            this.register(team);
    }
    /** Resolve a team by sport + any name variant */
    resolve(sport, name) {
        const normalized = this.key(sport, name);
        const id = this.nameIndex.get(normalized);
        return id ? this.teams.get(id) : undefined;
    }
    /** Resolve by external system ID. Sport-scoped to avoid cross-league collisions. */
    resolveByExternalId(source, externalId, sport) {
        // Try sport-scoped first (precise)
        if (sport) {
            const scopedId = this.externalIndex.get(`${sport}:${source}:${externalId}`);
            if (scopedId)
                return this.teams.get(scopedId);
        }
        // Fallback to unscoped (may collide across sports)
        const id = this.externalIndex.get(`${source}:${externalId}`);
        return id ? this.teams.get(id) : undefined;
    }
    /** Get a team by its canonical ID */
    get(id) {
        return this.teams.get(id);
    }
    /** Get all teams for a sport */
    bySport(sport) {
        return [...this.teams.values()].filter((t) => t.sport === sport);
    }
    /** Get all registered teams */
    all() {
        return [...this.teams.values()];
    }
    /** Fuzzy resolve — tries exact match first, then nickname (last word) */
    fuzzyResolve(sport, name) {
        // Exact
        const exact = this.resolve(sport, name);
        if (exact)
            return exact;
        // Try nickname (last word)
        const words = normalizeTeamName(name).split(' ');
        if (words.length > 1) {
            const nickname = words[words.length - 1];
            const byNickname = this.resolve(sport, nickname);
            if (byNickname)
                return byNickname;
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
    /** Auto-register an unknown team (for college sports with 350+ teams) */
    autoRegister(sport, name) {
        // Generate deterministic UUID from sport + normalized name
        const normalized = normalizeTeamName(name);
        const id = this.deterministicId(sport, normalized);
        // Derive abbreviation from name
        const words = name.split(' ');
        const abbreviation = words.length >= 2
            ? words.map(w => w[0]).join('').toUpperCase().slice(0, 4)
            : name.slice(0, 4).toUpperCase();
        // Short name = last word (usually the mascot)
        const shortName = words[words.length - 1] ?? name;
        const team = {
            id,
            name,
            shortName,
            abbreviation,
            sport,
            aliases: [normalized],
            externalIds: [],
        };
        this.register(team);
        return team;
    }
    deterministicId(sport, normalized) {
        // Simple hash → UUID v5-like format
        let hash = 0;
        const input = `${sport}:${normalized}`;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
        }
        const hex = Math.abs(hash).toString(16).padStart(8, '0');
        return `${hex.slice(0, 8)}-auto-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${sport.slice(0, 4)}-${normalized.slice(0, 12).replace(/\s/g, '')}`;
    }
    key(sport, name) {
        return `${sport}:${normalizeTeamName(name)}`;
    }
}
export function defineTeam(def) {
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
//# sourceMappingURL=team-registry.js.map