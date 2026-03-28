// ─── Sport & League Classification ──────────────────────────────────────────
export const SPORTS = {
    // Traditional
    nba: { slug: 'nba', name: 'NBA', type: 'traditional', shortName: 'NBA' },
    nfl: { slug: 'nfl', name: 'NFL', type: 'traditional', shortName: 'NFL' },
    nhl: { slug: 'nhl', name: 'NHL', type: 'traditional', shortName: 'NHL' },
    mlb: { slug: 'mlb', name: 'MLB', type: 'traditional', shortName: 'MLB' },
    ncaam: { slug: 'ncaam', name: "NCAA Men's Basketball", type: 'traditional', shortName: 'NCAAM' },
    ncaaw: { slug: 'ncaaw', name: "NCAA Women's Basketball", type: 'traditional', shortName: 'NCAAW' },
    ncaaf: { slug: 'ncaaf', name: 'NCAA Football', type: 'traditional', shortName: 'NCAAF' },
    wnba: { slug: 'wnba', name: 'WNBA', type: 'traditional', shortName: 'WNBA' },
    // Esports
    lol: { slug: 'lol', name: 'League of Legends', type: 'esport', shortName: 'LoL' },
    cs2: { slug: 'cs2', name: 'Counter-Strike 2', type: 'esport', shortName: 'CS2' },
    valorant: { slug: 'valorant', name: 'Valorant', type: 'esport', shortName: 'VAL' },
    dota2: { slug: 'dota2', name: 'Dota 2', type: 'esport', shortName: 'Dota2' },
    cod: { slug: 'cod', name: 'Call of Duty', type: 'esport', shortName: 'CoD' },
    rl: { slug: 'rl', name: 'Rocket League', type: 'esport', shortName: 'RL' },
};
export function isSport(s) {
    return s in SPORTS;
}
//# sourceMappingURL=sports.js.map