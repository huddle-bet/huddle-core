import type { LiveStateRow, ReducerResult, EsportsLiveEvent } from '../types.js';
interface CS2Player {
    id: string;
    name: string;
    teamId: string;
    side: string;
    kills: number;
    deaths: number;
    assists: number;
    headshots: number;
    flashAssists: number;
    suicides: number;
    entryKills: number;
    entryDeaths: number;
    multiKillRounds: number;
    adr: number;
    kast: number;
    hp: number;
    money: number;
    kevlar: boolean;
    helmet: boolean;
    defuseKit: boolean;
    primaryWeapon: string | null;
    /** Valorant agent display name. Stays null for CS2; populated for
     *  Valorant via the cs2_v2_full_state payload (reduceVal delegates
     *  to reduceCS2). */
    agent: string | null;
    dpr: number;
    clutchWins: number;
    bombPlanted: number;
    bombDefused: number;
    mvps: number;
}
interface RoundHistoryEntry {
    roundNumber: number;
    halfNumber: number;
    winnerId: string;
    winCondition: string;
}
interface MapRecord {
    mapNumber: number;
    mapName: string | null;
    winnerId: string | null;
    tie: boolean;
    roundsWon: Record<string, number>;
}
export interface CS2GameState {
    mapNumber: number | null;
    mapName: string | null;
    roundNumber: number;
    halfNumber: number;
    phase: string;
    roundsWon: Record<string, number>;
    sides: Record<string, string>;
    players: Record<string, CS2Player>;
    lastRoundWinner: string | null;
    lastRoundCondition: string | null;
    bombState: string | null;
    bombSite: string | null;
    maps: MapRecord[];
    roundHistory: RoundHistoryEntry[];
    /** Has the opening kill for the current round already been surfaced as
     *  a `first_kill` feed row? Reset on each `round_started`. */
    _firstKillEmittedForRound?: boolean;
    /** Last-seen per-player clutchWins tally — diff to emit `clutch` feed
     *  rows when vlr.gg's performance page updates. vlr reports the running
     *  total per player, so we need prev vs curr to spot a fresh clutch. */
    _prevClutchWins?: Record<string, number>;
}
export declare function createCS2State(): CS2GameState;
export declare function makeEmptyCS2Player(p: any): CS2Player;
export declare function ensureCS2Player(state: CS2GameState, playerPayload: any): void;
export declare function reduceCS2(prev: LiveStateRow, msg: EsportsLiveEvent): ReducerResult;
export {};
//# sourceMappingURL=cs2.d.ts.map