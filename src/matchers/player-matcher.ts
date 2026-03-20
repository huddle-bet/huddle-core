import type { PlayerRegistry } from '../ids/player-registry.js';
import type { Sport } from '../types/sports.js';
import { normalizePlayerName } from '../ids/normalize.js';

/**
 * Match two player names, using the registry for canonical resolution
 * and falling back to fuzzy matching.
 *
 * Pass teamIds to disambiguate "M. Williams" — when both names match multiple
 * players, only the one on the correct team is considered.
 */
export function playersMatch(
  registry: PlayerRegistry,
  sport: Sport,
  name1: string,
  name2: string,
  teamIds?: string[],
): boolean {
  // 1. Registry resolution
  const p1 = registry.resolve(sport, name1);
  const p2 = registry.resolve(sport, name2);
  if (p1 && p2) return p1.id === p2.id;

  // 2. Normalized exact match
  const n1 = normalizePlayerName(name1);
  const n2 = normalizePlayerName(name2);
  if (n1 === n2) return true;

  // 3. Handle "F. Last" abbreviated format
  //    "N. Powell" should match "Norman Powell"
  const abbr1 = toAbbreviated(n1);
  const abbr2 = toAbbreviated(n2);
  if (abbr1 && n2 === abbr1) return true;
  if (abbr2 && n1 === abbr2) return true;
  if (abbr1 && abbr2 && abbr1 === abbr2) return true;

  // 4. Last name + first initial match — but only if unambiguous
  //    "M. Williams" could be many players, so require team context
  const last1 = n1.split(' ').pop();
  const last2 = n2.split(' ').pop();
  const first1 = n1.split(' ')[0];
  const first2 = n2.split(' ')[0];
  if (last1 && last2 && last1 === last2 && last1.length > 3) {
    if (first1 && first2 && first1[0] === first2[0]) {
      // If we have team context, verify only one player on those teams matches
      if (teamIds && teamIds.length > 0) {
        const candidates = registry.bySport(sport).filter((p) => {
          const pNorm = normalizePlayerName(p.name);
          const pLast = pNorm.split(' ').pop();
          const pFirst = pNorm.split(' ')[0];
          return pLast === last1 && pFirst[0] === first1[0];
        });

        // Filter to players on the relevant teams
        const onTeam = candidates.filter((p) => {
          const currentTeamId = p.teamHistory.length > 0
            ? p.teamHistory[p.teamHistory.length - 1].teamId
            : undefined;
          return currentTeamId && teamIds.includes(currentTeamId);
        });

        // Ambiguous — multiple players with same initial+last on these teams
        if (onTeam.length > 1) return false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Convert "Norman Powell" → "n. powell"
 * Returns null if already abbreviated or single-word
 */
function toAbbreviated(normalized: string): string | null {
  const parts = normalized.split(' ');
  if (parts.length < 2) return null;
  if (parts[0].length <= 2) return null; // Already abbreviated
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}
