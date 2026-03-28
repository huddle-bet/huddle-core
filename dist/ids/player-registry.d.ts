import type { Player, DataSource } from '../types/entities.js';
import type { Sport } from '../types/sports.js';
/**
 * In-memory player registry that resolves any source-specific name or ID
 * to a canonical Player entity.
 *
 * Players can be registered from ingested data (auto-discovered) or
 * from pre-defined canonical lists.
 */
export declare class PlayerRegistry {
    private readonly players;
    /** "{sport}:{normalizedName}" → player IDs (multiple for duplicate names) */
    private readonly nameIndex;
    /** "{source}:{externalId}" → player ID */
    private readonly externalIndex;
    register(player: Player): void;
    private addToNameIndex;
    loadPlayers(players: Player[]): void;
    /**
     * Resolve by name. If multiple players share the name, returns the first one.
     * For disambiguation, use resolveByExternalId or resolveByNameAndTeam.
     */
    resolve(sport: Sport, name: string): Player | undefined;
    /** Returns all players matching this name (for duplicate detection) */
    resolveAll(sport: Sport, name: string): Player[];
    resolveByExternalId(source: DataSource, externalId: string): Player | undefined;
    get(id: string): Player | undefined;
    bySport(sport: Sport): Player[];
    /** Get all players currently on a given team */
    byTeam(teamId: string): Player[];
    all(): Player[];
    /**
     * Auto-register a player discovered from ingested data.
     * Returns existing player if already known, otherwise creates new.
     *
     * @param date ISO date string of the game this data came from.
     *             Used to build team history timeline.
     */
    getOrCreate(sport: Sport, name: string, opts?: {
        gamertag?: string;
        teamId?: string;
        date?: string;
        position?: string;
        source?: DataSource;
        externalId?: string;
    }): Player;
    /**
     * Resolve a player by name AND team context.
     * Handles duplicate names: if multiple players share a name,
     * returns the one currently on the given team.
     */
    private resolveByNameAndTeam;
    private key;
}
/** Get a player's current team ID (latest open stint) */
export declare function currentTeam(player: Player): string | undefined;
/** Get a player's team on a specific date */
export declare function teamOnDate(player: Player, date: string): string | undefined;
//# sourceMappingURL=player-registry.d.ts.map