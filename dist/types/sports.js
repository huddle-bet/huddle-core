// ─── Sport & League Classification ──────────────────────────────────────────
export const SPORTS = {
    // Traditional
    nba: { slug: 'nba', name: 'NBA', type: 'traditional', shortName: 'NBA', liveProvider: 'sportradar', scheduleProviders: ['sportradar', 'espn'] },
    nfl: { slug: 'nfl', name: 'NFL', type: 'traditional', shortName: 'NFL', liveProvider: 'sportradar', scheduleProviders: ['sportradar', 'espn'] },
    nhl: { slug: 'nhl', name: 'NHL', type: 'traditional', shortName: 'NHL', liveProvider: 'sportradar', scheduleProviders: ['sportradar', 'espn'] },
    mlb: { slug: 'mlb', name: 'MLB', type: 'traditional', shortName: 'MLB', liveProvider: 'sportradar', scheduleProviders: ['sportradar', 'espn'] },
    // Esports
    lol: { slug: 'lol', name: 'League of Legends', type: 'esport', shortName: 'LoL', liveProvider: 'lolesports', scheduleProviders: ['bo3gg', 'lolesports'] },
    cs2: { slug: 'cs2', name: 'Counter-Strike 2', type: 'esport', shortName: 'CS2', liveProvider: 'hltv', scheduleProviders: ['hltv'] },
    valorant: { slug: 'valorant', name: 'Valorant', type: 'esport', shortName: 'VAL', liveProvider: 'vlr.gg', scheduleProviders: ['vlr.gg'] },
    dota2: { slug: 'dota2', name: 'Dota 2', type: 'esport', shortName: 'Dota2', liveProvider: 'valve', scheduleProviders: ['bo3gg'] },
    cod: { slug: 'cod', name: 'Call of Duty', type: 'esport', shortName: 'CoD', liveProvider: 'breakingpoint', scheduleProviders: ['breakingpoint'] },
    rl: { slug: 'rl', name: 'Rocket League', type: 'esport', shortName: 'RL', liveProvider: 'blast', scheduleProviders: ['blast'] },
    // r6: live polling retired (siege.gg moved behind a Cloudflare managed
    // challenge; r6 is a low-volume sportsbook market). Schedule + post-game
    // per-round telemetry come from Ubisoft's official esports portal via
    // R6UbisoftBackfiller. Events transition scheduled → final without
    // intermediate live_state writes; huddle-live has no R6 live adapter.
    r6: { slug: 'r6', name: 'Rainbow Six Siege', type: 'esport', shortName: 'R6', scheduleProviders: ['r6.ubisoft.com'] },
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