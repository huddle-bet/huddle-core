import { SPORTS, isSport, type Sport } from '../types/sports.js';

/**
 * Which leagues are live, and what each one is expected to produce.
 *
 * ## Why this exists
 *
 * Before this, "which leagues does a service handle" was a hardcoded string in a deploy
 * manifest, with nothing reconciling it against what the service could actually do.
 * `huddle-core/render.yaml` polled `nba nhl mlb ncaam cs2 lol valorant dota2 cod rl`:
 *
 * - `ncaam` is not a sport this system has ever had. `resolveLeague` throws on it.
 * - `nfl` was absent, while huddle-odds carried a complete book-id map for it.
 * - `rl` was present, while huddle-odds has no book id for it on any book — it cannot
 *   produce odds and never could.
 *
 * Three different failure modes in one string, none of them detected by anything.
 *
 * ## What this is not
 *
 * It is **not** a claim about what is deployed. Verified 2026-08-01: odds were flowing
 * for mlb, cs2, valorant, cod, lol and dota2 while the manifest said otherwise, so the
 * running configuration and the checked-in manifest had already diverged. A registry
 * only helps if services *derive* their configuration from it rather than restating it —
 * see `leaguesFor`.
 *
 * ## The seasonality trap
 *
 * A league producing zero rows is ambiguous: out of season, or broken? On 2026-08-01
 * NBA, NFL and NHL all produced zero odds, and only one of those was a defect. That
 * ambiguity is exactly why `active` is declared here rather than inferred from row
 * counts — an assertion can then ask "is every *declared-active* league producing?"
 * and get an answer that means something.
 */

export type Capability =
  /** Upcoming fixtures written to `events`. */
  | 'schedule'
  /** In-play state — score, clock, feed. */
  | 'live'
  /** Sportsbook prices, game lines and player props. */
  | 'odds'
  /** Model output — projections, edges, hit rates. */
  | 'projections';

export const CAPABILITIES: readonly Capability[] = ['schedule', 'live', 'odds', 'projections'];

export interface LeagueRegistration {
  /**
   * Whether this league runs at all. `false` means dormant by decision — no service
   * should poll it and no assertion should expect rows from it.
   */
  active: boolean;
  /** What an active league is expected to produce. Absent capability = expect nothing. */
  capabilities: readonly Capability[];
  /** Why, when the entry isn't self-evident. */
  note?: string;
}

export const LEAGUE_REGISTRY: Record<Sport, LeagueRegistration> = {
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
export function leaguesFor(capability: Capability): Sport[] {
  return (Object.keys(LEAGUE_REGISTRY) as Sport[]).filter(
    (s) => LEAGUE_REGISTRY[s].active && LEAGUE_REGISTRY[s].capabilities.includes(capability),
  );
}

export function isActive(sport: Sport): boolean {
  return LEAGUE_REGISTRY[sport].active;
}

export function supports(sport: Sport, capability: Capability): boolean {
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
export function assertRegistered(value: string, capability: Capability): Sport {
  if (!isSport(value)) {
    const known = (Object.keys(LEAGUE_REGISTRY) as Sport[]).join(', ');
    throw new Error(`Unknown league "${value}". Known leagues: ${known}`);
  }
  const entry = LEAGUE_REGISTRY[value];
  if (!entry.active) {
    throw new Error(`League "${value}" is registered but not active${entry.note ? ` — ${entry.note}` : ''}`);
  }
  if (!entry.capabilities.includes(capability)) {
    throw new Error(
      `League "${value}" (${SPORTS[value].name}) is not registered for "${capability}". ` +
        `It provides: ${entry.capabilities.join(', ') || 'nothing'}.` +
        (entry.note ? ` ${entry.note}` : ''),
    );
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
export function reconcile(
  requested: readonly string[],
  capability: Capability,
): { resolved: Sport[]; unknown: string[]; unsupported: Sport[]; missing: Sport[] } {
  const unknown: string[] = [];
  const unsupported: Sport[] = [];
  const resolved: Sport[] = [];

  for (const value of requested) {
    if (!isSport(value)) {
      unknown.push(value);
    } else if (!supports(value, capability)) {
      unsupported.push(value);
    } else {
      resolved.push(value);
    }
  }

  const missing = leaguesFor(capability).filter((s) => !resolved.includes(s));
  return { resolved, unknown, unsupported, missing };
}
