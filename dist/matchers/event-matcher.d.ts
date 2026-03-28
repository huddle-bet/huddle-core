import type { TeamRegistry } from '../ids/team-registry.js';
import type { Sport } from '../types/sports.js';
/**
 * A minimal event representation for cross-source matching.
 * Consumers provide this from their own event types.
 */
export interface MatchableEvent {
    id: string;
    startTime: string;
    teams: string[];
}
export interface EventMatch<T extends MatchableEvent> {
    event1: T;
    event2: T | null;
}
/**
 * Match events from two different sources by start time and team names.
 *
 * @param maxTimeDiffMs Maximum time difference to consider a match (default: 2 hours)
 */
export declare function matchEvents<A extends MatchableEvent, B extends MatchableEvent>(registry: TeamRegistry, sport: Sport, events1: A[], events2: B[], maxTimeDiffMs?: number): EventMatch<A | B>[];
//# sourceMappingURL=event-matcher.d.ts.map