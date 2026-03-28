import { teamsMatch } from './team-matcher.js';
/**
 * Match events from two different sources by start time and team names.
 *
 * @param maxTimeDiffMs Maximum time difference to consider a match (default: 2 hours)
 */
export function matchEvents(registry, sport, events1, events2, maxTimeDiffMs = 2 * 60 * 60 * 1000) {
    const used = new Set();
    return events1.map((e1) => {
        const e1Time = new Date(e1.startTime).getTime();
        const match = events2.find((e2) => {
            if (used.has(e2.id))
                return false;
            const e2Time = new Date(e2.startTime).getTime();
            if (Math.abs(e1Time - e2Time) > maxTimeDiffMs)
                return false;
            // Check team overlap
            return e1.teams.some((t1) => e2.teams.some((t2) => teamsMatch(registry, sport, t1, t2)));
        });
        if (match)
            used.add(match.id);
        return { event1: e1, event2: (match ?? null) };
    });
}
//# sourceMappingURL=event-matcher.js.map