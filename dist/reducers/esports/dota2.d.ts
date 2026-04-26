import type { LiveStateRow, ReducerResult, EsportsLiveEvent } from '../types.js';
interface Dota2Team {
    id: string;
    name: string;
    side: string;
    totalKills: number;
    totalGold: number;
}
interface Dota2Player {
    id: string;
    name: string;
    teamId: string;
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