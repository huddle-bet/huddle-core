// ─── Sport & League Classification ──────────────────────────────────────────

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

export const SPORTS: Record<Sport, SportConfig> = {
  // Traditional
  nba:   { slug: 'nba',   name: 'NBA',                        type: 'traditional', shortName: 'NBA' },
  nfl:   { slug: 'nfl',   name: 'NFL',                        type: 'traditional', shortName: 'NFL' },
  nhl:   { slug: 'nhl',   name: 'NHL',                        type: 'traditional', shortName: 'NHL' },
  mlb:   { slug: 'mlb',   name: 'MLB',                        type: 'traditional', shortName: 'MLB' },
  ncaam: { slug: 'ncaam', name: "NCAA Men's Basketball",       type: 'traditional', shortName: 'NCAAM' },
  ncaaw: { slug: 'ncaaw', name: "NCAA Women's Basketball",     type: 'traditional', shortName: 'NCAAW' },
  ncaaf: { slug: 'ncaaf', name: 'NCAA Football',               type: 'traditional', shortName: 'NCAAF' },
  wnba:  { slug: 'wnba',  name: 'WNBA',                       type: 'traditional', shortName: 'WNBA' },
  // Esports
  lol:      { slug: 'lol',      name: 'League of Legends', type: 'esport', shortName: 'LoL' },
  cs2:      { slug: 'cs2',      name: 'Counter-Strike 2',  type: 'esport', shortName: 'CS2' },
  valorant: { slug: 'valorant', name: 'Valorant',          type: 'esport', shortName: 'VAL' },
  dota2:    { slug: 'dota2',    name: 'Dota 2',            type: 'esport', shortName: 'Dota2' },
  cod:      { slug: 'cod',      name: 'Call of Duty',      type: 'esport', shortName: 'CoD' },
  rl:       { slug: 'rl',       name: 'Rocket League',     type: 'esport', shortName: 'RL' },
};

export function isSport(s: string): s is Sport {
  return s in SPORTS;
}
