import { SPORTS, isSport } from '../types/sports.js';
export const CAPABILITIES = ['schedule', 'live', 'odds', 'projections'];
export const LEAGUE_REGISTRY = {
    nba: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    nfl: {
        active: true,
        capabilities: ['schedule', 'live', 'odds', 'projections'],
        note: 'Absent from the deployed odds poll list despite a complete book-id map (ENG-423). Out of season as of 2026-08-01, which is why zero rows was not distinguishable from the defect.',
    },
    nhl: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    mlb: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    cs2: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    lol: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    valorant: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    cod: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    dota2: { active: true, capabilities: ['schedule', 'live', 'odds', 'projections'] },
    rl: {
        active: true,
        capabilities: ['schedule', 'live'],
        note: 'No book carries Rocket League — every book id in huddle-odds is empty. It was in the deployed poll list anyway, where it could only ever be a no-op.',
    },
    r6: {
        active: false,
        capabilities: ['schedule'],
        note: 'Schedule only, and dormant. PrizePicks and Underdog have offered R6 props during Six Invitational and Major windows, but the ids are gated behind live offerings and are empty outside them.',
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