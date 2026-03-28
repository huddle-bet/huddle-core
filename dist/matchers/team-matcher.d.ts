import type { TeamRegistry } from '../ids/team-registry.js';
import type { Sport } from '../types/sports.js';
/**
 * Match two team names, using the registry for canonical resolution
 * and falling back to fuzzy matching.
 */
export declare function teamsMatch(registry: TeamRegistry, sport: Sport, name1: string, name2: string): boolean;
//# sourceMappingURL=team-matcher.d.ts.map