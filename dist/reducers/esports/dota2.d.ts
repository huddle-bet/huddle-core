import type { LiveStateRow, ReducerResult, EsportsLiveEvent } from '../types.js';
interface Dota2StructureCount {
    destroyed: number;
    remaining: number;
}
interface Dota2Structures {
    towers: Dota2StructureCount;
    barracks: Dota2StructureCount;
    shrines: Dota2StructureCount;
    ancientDestroyed: boolean;
}
interface Dota2Team {
    id: string;
    name: string;
    side: string;
    totalKills: number;
    totalGold: number;
    structures: Dota2Structures;
}
interface Dota2Player {
    id: string;
    name: string;
    teamId: string;
    accountId: number | null;
    teamSlot: number | null;
    heroId: number | null;
    heroName: string;
    kills: number;
    deaths: number;
    assists: number;
    lastHits: number;
    denies: number;
    totalGold: number;
    level: number;
    goldPerMin: number;
    xpPerMin: number;
    items: number[];
    itemNames: string[];
}
export interface Dota2GameState {
    mapNumber: number | null;
    gameTime: number;
    /** Day/night clock from Valve's match.time_of_day — float in [0..1].
     *  Null until the first full_state arrives. */
    timeOfDay: number | null;
    /** Night Stalker's ult forces night regardless of the natural cycle. */
    isNightStalkerNight: boolean;
    phase: string;
    teams: Record<string, Dota2Team>;
    players: Record<string, Dota2Player>;
    maps: Array<{
        mapNumber: number;
        winnerId: string;
    }>;
    heroMap: Record<string, string>;
    itemMap: Record<string, string>;
    /** Snapshot of player kill counts from the previous full_state, used to diff kills. */
    _prevPlayerKills: Record<string, number>;
    /** Prev destroyed-state per building (tower/barracks/ancient/shrine) —
     *  keyed `side:type:lane:tier`. Diff against next snapshot to emit
     *  tower_destroyed / barracks_destroyed / ancient_destroyed events. */
    _prevBuildings: Record<string, boolean>;
    /** Last known roshan_respawn_time (seconds). Going from 0/null → positive
     *  means Roshan was just killed. */
    _prevRoshanRespawn: number;
    /** Total Roshan kills this map. Per-team attribution is not in Valve's
     *  realtime feed (PandaScore exposes `roshan_kills` per side via heuristic
     *  inference); we surface the total only and let consumers correlate to
     *  aegis pickup via _aegisHolder if they need attribution. */
    roshanKills: number;
    /** First blood happens exactly once per map — latched so the 2nd+
     *  full_state snapshots don't re-emit. */
    _firstBloodEmitted: boolean;
    /** Snapshot of player net_worth — falling sharply while death count
     *  jumped is a buyback heuristic signal. */
    _prevPlayerNetWorth: Record<string, number>;
    /** Player id currently holding Aegis of the Immortal (item id 117), set
     *  when we first detect the item after a Roshan kill. Cleared either on
     *  the next roshan_respawn cycle or when the holder no longer has it in
     *  their inventory. */
    _aegisHolder: string | null;
}
export declare function createDota2State(): Dota2GameState;
export declare function reduceDota2(prev: LiveStateRow, msg: EsportsLiveEvent): ReducerResult;
export {};
//# sourceMappingURL=dota2.d.ts.map