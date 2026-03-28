import type { DataSource } from './entities.js';
import type { Sport } from './sports.js';
/**
 * Schema-ready interfaces matching what any consuming repo's DB would look like.
 * Stats fields use Record<string, string | number> (JSONB in Postgres) to handle
 * sport-specific stats: NBA {PTS, REB}, CS2 {kills, deaths, rating}, etc.
 */
/** A single game/match between two teams */
export interface DbGame {
    id: string;
    sport: Sport;
    /** ISO 8601 start time */
    startTime: string;
    homeTeamId: string;
    awayTeamId: string;
    status: 'scheduled' | 'live' | 'final';
    /** Source that provided this game data */
    source: DataSource;
    sourceId: string;
}
/** Extended game info (venue, broadcast, etc.) */
export interface DbGameInfo {
    gameId: string;
    venue?: string;
    broadcast?: string;
    attendance?: number;
    /** Arbitrary metadata from the source */
    meta?: Record<string, string | number>;
}
/** Team-level stats for a game */
export interface DbTeamBoxscore {
    gameId: string;
    teamId: string;
    /** Sport-specific stats: NBA {PTS, REB, AST, ...}, NHL {goals, shots, ...} */
    stats: Record<string, string | number>;
}
/** Player-level stats for a game */
export interface DbPlayerBoxscore {
    gameId: string;
    playerId: string;
    teamId: string;
    /** Sport-specific stats: NBA {PTS, REB, AST, MIN, ...}, NHL {goals, assists, ...} */
    stats: Record<string, string | number>;
}
/** An individual play within a game */
export interface DbPlay {
    id: string;
    gameId: string;
    /** Sequence number within the game */
    sequence: number;
    /** Period/quarter/half */
    period: number;
    /** Clock time remaining in period */
    clock?: string;
    /** Play type: "shot", "turnover", "foul", etc. */
    type: string;
    /** Human-readable description */
    description?: string;
    /** Arbitrary play data */
    data?: Record<string, string | number>;
}
/** A player involved in a play */
export interface DbPlayParticipant {
    playId: string;
    playerId: string;
    /** Role in the play: "shooter", "assister", "blocker", etc. */
    role: string;
}
/** A drive (NFL) grouping consecutive plays */
export interface DbDrive {
    id: string;
    gameId: string;
    teamId: string;
    /** Sequence number within the game */
    sequence: number;
    /** Drive result: "touchdown", "field_goal", "punt", etc. */
    result?: string;
    /** Arbitrary drive data */
    data?: Record<string, string | number>;
}
/** A single map within an esports match/series */
export interface DbGameMap {
    id: string;
    gameId: string;
    /** Map number within the series (1, 2, 3, ...) */
    mapNumber: number;
    /** Map name: "Mirage", "Bind", "Summoner's Rift" */
    mapName?: string;
    /** Winning team ID */
    winnerTeamId?: string;
    /** Map-level stats: {team1Score, team2Score, duration, ...} */
    stats?: Record<string, string | number>;
}
/** Per-map player stats (esports) */
export interface DbMapPlayerStat {
    gameMapId: string;
    playerId: string;
    teamId: string;
    /** Agent/champion/character played */
    agent?: string;
    /** Player stats for this map: CS2 {kills, deaths, rating}, VAL {ACS, KAST, ADR}, etc. */
    stats: Record<string, string | number>;
}
/** Links a canonical entity to an external system ID */
export interface DbExternalId {
    /** The canonical entity ID (team/player UUID) */
    entityId: string;
    entityType: 'team' | 'player' | 'game';
    source: DataSource;
    sourceId: string;
}
/** A player's stint on a team */
export interface DbTeamStint {
    playerId: string;
    teamId: string;
    /** ISO date when this affiliation was first observed */
    from: string;
    /** ISO date when this affiliation ended. Null = current. */
    until: string | null;
}
//# sourceMappingURL=schema.d.ts.map