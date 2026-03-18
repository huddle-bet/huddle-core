import type { TeamRegistry } from '../ids/team-registry.js';
import type { Sport } from '../types/sports.js';
import { teamsMatch } from './team-matcher.js';

/**
 * A minimal event representation for cross-source matching.
 * Consumers provide this from their own event types.
 */
export interface MatchableEvent {
  id: string;
  startTime: string; // ISO 8601
  teams: string[];   // Team names (at least 1, typically 2)
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
export function matchEvents<A extends MatchableEvent, B extends MatchableEvent>(
  registry: TeamRegistry,
  sport: Sport,
  events1: A[],
  events2: B[],
  maxTimeDiffMs = 2 * 60 * 60 * 1000,
): EventMatch<A | B>[] {
  const used = new Set<string>();

  return events1.map((e1) => {
    const e1Time = new Date(e1.startTime).getTime();

    const match = events2.find((e2) => {
      if (used.has(e2.id)) return false;

      const e2Time = new Date(e2.startTime).getTime();
      if (Math.abs(e1Time - e2Time) > maxTimeDiffMs) return false;

      // Check team overlap
      return e1.teams.some((t1) =>
        e2.teams.some((t2) => teamsMatch(registry, sport, t1, t2)),
      );
    });

    if (match) used.add(match.id);
    return { event1: e1 as A | B, event2: (match ?? null) as (A | B) | null };
  });
}
