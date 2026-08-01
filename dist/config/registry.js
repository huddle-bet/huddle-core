import { SPORTS, isSport } from '../types/sports.js';
export const CAPABILITIES = ['schedule', 'live', 'odds', 'projections'];
export const LEAGUE_REGISTRY = {
    // ── The major four. Sportradar is the sole provider for all of them. ──
    // Launch emphasis is NFL and NBA; MLB and NHL ship too if they hold up.
    nfl: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    nba: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    mlb: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    nhl: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    // ── The one esport. ──
    cs2: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    // ── Descoped 2026-08-01. ──
    // Scope is the major four plus CS2. These six stay in the type union because
    // years of their rows are in the database and code still reads them — dropping
    // the slug would orphan that data rather than retire the sport. `active: false`
    // is the switch that matters: nothing polls, projects or asserts against them.
    //
    // Each ran on a single scraped source with no fallback, which is most of why
    // the set is being cut. Reactivating one means committing to that scraper again.
    lol: { active: false, capabilities: [], note: 'Descoped 2026-08-01. Ran on lolesports, sole source.' },
    valorant: { active: false, capabilities: [], note: 'Descoped 2026-08-01. Ran on vlr.gg, sole source.' },
    dota2: { active: false, capabilities: [], note: 'Descoped 2026-08-01. Ran on Valve, sole source.' },
    cod: { active: false, capabilities: [], note: 'Descoped 2026-08-01. Ran on BreakingPoint, sole source.' },
    rl: {
        active: false,
        capabilities: [],
        note: 'Descoped 2026-08-01. Ran on BLAST, sole source, and no book ever carried it — every book id in huddle-odds is empty, so its odds polling could only ever be a no-op.',
    },
    r6: {
        active: false,
        capabilities: [],
        note: 'Descoped 2026-08-01; already dormant before that. PrizePicks and Underdog offer R6 props only during Six Invitational and Major windows.',
    },
};
/** Active leagues expected to produce for a capability. This is what services derive from. */
export function leaguesFor(capability) {
    return Object.keys(LEAGUE_REGISTRY).filter((s) => LEAGUE_REGISTRY[s].active && LEAGUE_REGISTRY[s].capabilities.includes(capability));
}
export function isActive(sport) {
    return LEAGUE_REGISTRY[sport].active;
}
export function supports(sport, capability) {
    const entry = LEAGUE_REGISTRY[sport];
    return entry.active && entry.capabilities.includes(capability);
}
/**
 * Narrow a string to a `Sport` that is registered for `capability`, or throw with a
 * message that says what to do about it.
 *
 * The throw is the point. A service handed a league it cannot serve should fail at
 * startup, not skip it quietly for three months — which is how `ncaam` survived in the
 * deployed poll command since 2026-03-27.
 */
export function assertRegistered(value, capability) {
    if (!isSport(value)) {
        const known = Object.keys(LEAGUE_REGISTRY).join(', ');
        throw new Error(`Unknown league "${value}". Known leagues: ${known}`);
    }
    const entry = LEAGUE_REGISTRY[value];
    if (!entry.active) {
        throw new Error(`League "${value}" is registered but not active${entry.note ? ` — ${entry.note}` : ''}`);
    }
    if (!entry.capabilities.includes(capability)) {
        throw new Error(`League "${value}" (${SPORTS[value].name}) is not registered for "${capability}". ` +
            `It provides: ${entry.capabilities.join(', ') || 'nothing'}.` +
            (entry.note ? ` ${entry.note}` : ''));
    }
    return value;
}
/**
 * Reconcile an explicitly supplied league list against the registry.
 *
 * Returns what's wrong rather than throwing, so a caller can decide whether an
 * intentional subset is acceptable — but `missing` being non-empty is the case ENG-432
 * exists for: a league declared active whose deploy config quietly stopped asking for it.
 */
export function reconcile(requested, capability) {
    const unknown = [];
    const unsupported = [];
    const resolved = [];
    for (const value of requested) {
        if (!isSport(value)) {
            unknown.push(value);
        }
        else if (!supports(value, capability)) {
            unsupported.push(value);
        }
        else {
            resolved.push(value);
        }
    }
    const missing = leaguesFor(capability).filter((s) => !resolved.includes(s));
    return { resolved, unknown, unsupported, missing };
}
//# sourceMappingURL=registry.js.map