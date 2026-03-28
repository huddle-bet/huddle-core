export type SportType = 'traditional' | 'esport';
export type TraditionalSport = 'nba' | 'nfl' | 'nhl' | 'mlb' | 'ncaam' | 'ncaaw' | 'ncaaf' | 'wnba';
export type EsportGame = 'lol' | 'cs2' | 'valorant' | 'dota2' | 'cod' | 'rl';
export type Sport = TraditionalSport | EsportGame;
export interface SportConfig {
    slug: Sport;
    name: string;
    type: SportType;
    /** Display-friendly short name */
    shortName: string;
}
export declare const SPORTS: Record<Sport, SportConfig>;
export declare function isSport(s: string): s is Sport;
//# sourceMappingURL=sports.d.ts.map