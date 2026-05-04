import type { LiveStateRow, ReducerResult, EsportsLiveEvent } from '../types.js';
interface LoLTeam {
    id: string;
    name: string;
    side: string;
    totalKills: number;
    totalGold: number;
    towers: number;
    inhibitors: number;
    dragons: string[];
    barons: number;
}
interface LoLPlayer {
    id: string;
    name: string;
    teamId: string;
    role: string;
    championName: string;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    totalGold: number;
    level: number;
    currentHealth: number;
    maxHealth: number;
    items: any[];
    wardsPlaced: number;
    wardsDestroyed: number;
    championDamageShare: number;
    killParticipation: number;
    combatStats: LoLCombatStats | null;
    perkMetadata: LoLPerkMetadata | null;
}
interface LoLPerkMetadata {
    styleId: number;
    subStyleId: number;
    perks: number[];
}
interface LoLCombatStats {
    attackDamage: number;
    abilityPower: number;
    criticalChance: number;
    attackSpeed: number;
    lifeSteal: number;
    armor: number;
    magicResistance: number;
    tenacity: number;
}
export interface LoLGameState {
    mapNumber: number | null;
    gameTime: number;
    phase: string;
    teams: Record<string, LoLTeam>;
    players: Record<string, LoLPlayer>;
    maps: Array<{
        mapNumber: number;
        winnerId: string;
    }>;
    lastObjective: {
        type: string;
        teamId: string;
        detail?: string;
    } | null;
    lastDragonKillTime: number | null;
    baronKillerTeamId: string | null;
    lastBaronKillTime: number | null;
    /** First-blood latch — fires once per map, reset on map_started. */
    _firstBloodEmitted?: boolean;
    /** Per-player { ts: ms, count: n } — for multi_kill (double/triple/
     *  quadra/penta) detection. A chain extends while successive kills are
     *  within MULTI_KILL_WINDOW_SEC of the previous. */
    _killChains?: Record<string, {
        lastGameTime: number;
        count: number;
    }>;
    /** First-tower latch — fires on the first tower kill of the map. Reset
     *  on map_started. Riot's feed doesn't ship a "first tower" signal so
     *  we derive it from the tower_destroyed event stream. */
    _firstTowerEmitted?: boolean;
}
export declare function createLoLState(): LoLGameState;
export declare function reduceLoL(prev: LiveStateRow, msg: EsportsLiveEvent): ReducerResult;
export {};
//# sourceMappingURL=lol.d.ts.map