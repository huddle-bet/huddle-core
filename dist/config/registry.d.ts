import { type Sport } from '../types/sports.js';
/**
 * Which leagues are live, and what each one is expected to produce.
 *
 * ## Scope, set 2026-08-01, confirmed 2026-08-02
 *
 * The major four — NFL, NBA, MLB, NHL — plus CS2. Every other esport is descoped.
 *
 * **`active` is also the launch-visibility flag.** All five active leagues surface in the
 * product; the six descoped esports do not. There is no second flag and no third state,
 * and huddle-api's read gate derives from `isActive` for exactly this reason (ENG-515).
 *
 * This used to read "launch emphasis on NFL and NBA; MLB and NHL ship too if they hold
 * up", which was true but hedged, and ENG-403 was simultaneously recording MLB and NHL as
 * "ingest on, hidden at read". Both readings survived because neither was falsifiable
 * from here. They are not equivalent: MLB is the only traditional sport currently in
 * season, so hiding it would have taken the August product from 125 fixtures to 31.
 * Settled in favour of showing all five — if that changes, change it here, because this
 * is the only place the answer lives.
 *
 * The traditional four are to run on **Sportradar alone**. ESPN is being removed as their
 * fallback: it contributed 0 of 39,489 NFL player rows, and Sportradar already carries
 * more rows and equal recency in all four.
 *
 * That removal is **not done yet**, and doing it today would take NFL dark. Measured
 * 2026-08-01: Sportradar has 0 upcoming NFL fixtures while ESPN has 7, because
 * `NFL_SEASON_TYPES` in huddle-data omits `'PRE'` and it is preseason. Sportradar's
 * schedule lookahead is also 3 days against ESPN's 14, which is why ESPN shows more
 * upcoming MLB fixtures. Both are config, not capability — the API returns 49 preseason
 * games on request. Fix those, verify Sportradar produces, then drop ESPN.
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
'schedule'
/** In-play state — score, clock, feed. */
 | 'live'
/** Sportsbook prices, game lines and player props. */
 | 'odds'
/** Model output — projections, edges, hit rates. */
 | 'projections';
export declare const CAPABILITIES: readonly Capability[];
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
export declare const LEAGUE_REGISTRY: Record<Sport, LeagueRegistration>;
/** Active leagues expected to produce for a capability. This is what services derive from. */
export declare function leaguesFor(capability: Capability): Sport[];
export declare function isActive(sport: Sport): boolean;
export declare function supports(sport: Sport, capability: Capability): boolean;
/**
 * Narrow a string to a `Sport` that is registered for `capability`, or throw with a
 * message that says what to do about it.
 *
 * The throw is the point. A service handed a league it cannot serve should fail at
 * startup, not skip it quietly for three months — which is how `ncaam` survived in the
 * deployed poll command since 2026-03-27.
 */
export declare function assertRegistered(value: string, capability: Capability): Sport;
/**
 * Reconcile an explicitly supplied league list against the registry.
 *
 * Returns what's wrong rather than throwing, so a caller can decide whether an
 * intentional subset is acceptable — but `missing` being non-empty is the case ENG-432
 * exists for: a league declared active whose deploy config quietly stopped asking for it.
 */
export declare function reconcile(requested: readonly string[], capability: Capability): {
    resolved: Sport[];
    unknown: string[];
    unsupported: Sport[];
    missing: Sport[];
};
//# sourceMappingURL=registry.d.ts.map