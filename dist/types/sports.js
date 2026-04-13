// ─── Sport & League Classification ──────────────────────────────────────────
export const SPORTS = {
    // Traditional
    nba: { slug: 'nba', name: 'NBA', type: 'traditional', shortName: 'NBA', liveProvider: 'espn', scheduleProviders: ['espn'] },
    nfl: { slug: 'nfl', name: 'NFL', type: 'traditional', shortName: 'NFL', liveProvider: 'espn', scheduleProviders: ['espn'] },
    nhl: { slug: 'nhl', name: 'NHL', type: 'traditional', shortName: 'NHL', liveProvider: 'espn', scheduleProviders: ['espn'] },
    mlb: { slug: 'mlb', name: 'MLB', type: 'traditional', shortName: 'MLB', liveProvider: 'espn', scheduleProviders: ['espn'] },
    ncaam: { slug: 'ncaam', name: "NCAA Men's Basketball", type: 'traditional', shortName: 'NCAAM', liveProvider: 'espn', scheduleProviders: ['espn'] },
    ncaaf: { slug: 'ncaaf', name: 'NCAA Football', type: 'traditional', shortName: 'NCAAF', liveProvider: 'espn', scheduleProviders: ['espn'] },
    // Esports
    lol: { slug: 'lol', name: 'League of Legends', type: 'esport', shortName: 'LoL', liveProvider: 'gsk', scheduleProviders: ['bo3gg', 'gsk'] },
    cs2: { slug: 'cs2', name: 'Counter-Strike 2', type: 'esport', shortName: 'CS2', liveProvider: 'gsk', scheduleProviders: ['bo3gg', 'gsk'] },
    valorant: { slug: 'valorant', name: 'Valorant', type: 'esport', shortName: 'VAL', liveProvider: 'gsk', scheduleProviders: ['vlr.gg', 'gsk'] },
    dota2: { slug: 'dota2', name: 'Dota 2', type: 'esport', shortName: 'Dota2', liveProvider: 'gsk', scheduleProviders: ['dltv', 'gsk'] },
    cod: { slug: 'cod', name: 'Call of Duty', type: 'esport', shortName: 'CoD', scheduleProviders: ['breakingpoint'] },
    rl: { slug: 'rl', name: 'Rocket League', type: 'esport', shortName: 'RL', scheduleProviders: ['blast'] },
};
export function isSport(s) {
    return s in SPORTS;
}
/** Sports with any live coverage. Used by huddle-live's adapters. */
export function sportsWithLiveProvider(provider) {
    return Object.values(SPORTS)
        .filter((s) => s.liveProvider === provider)
        .map((s) => s.slug);
}
/** Sports fed by a particular schedule provider. Used by huddle-data. */
export function sportsWithScheduleProvider(provider) {
    return Object.values(SPORTS)
        .filter((s) => s.scheduleProviders.includes(provider))
        .map((s) => s.slug);
}
/** All sports of a given type (traditional vs esport). */
export function sportsOfType(type) {
    return Object.values(SPORTS)
        .filter((s) => s.type === type)
        .map((s) => s.slug);
}
//# sourceMappingURL=sports.js.map