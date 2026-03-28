import type { PlayerRegistry } from '../ids/player-registry.js';
import type { Sport } from '../types/sports.js';
/**
 * Match two player names, using the registry for canonical resolution
 * and falling back to fuzzy matching.
 *
 * Pass teamIds to disambiguate "M. Williams" — when both names match multiple
 * players, only the one on the correct team is considered.
 */
export declare function playersMatch(registry: PlayerRegistry, sport: Sport, name1: string, name2: string, teamIds?: string[]): boolean;
//# sourceMappingURL=player-matcher.d.ts.map