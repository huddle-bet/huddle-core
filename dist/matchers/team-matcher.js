import { normalizeTeamName } from '../ids/normalize.js';
/**
 * Match two team names, using the registry for canonical resolution
 * and falling back to fuzzy matching.
 */
export function teamsMatch(registry, sport, name1, name2) {
    // 1. Try registry resolution — both resolve to same canonical team
    const t1 = registry.fuzzyResolve(sport, name1);
    const t2 = registry.fuzzyResolve(sport, name2);
    if (t1 && t2)
        return t1.id === t2.id;
    // 2. Fuzzy fallback — compare normalized nicknames
    const n1 = normalizeTeamName(name1);
    const n2 = normalizeTeamName(name2);
    // Exact match
    if (n1 === n2)
        return true;
    // Nickname match (last word)
    const nick1 = n1.split(' ').pop() ?? n1;
    const nick2 = n2.split(' ').pop() ?? n2;
    // Require nickname length > 3 to avoid false positives ("LA" matching multiple)
    if (nick1.length > 3 && nick2.length > 3 && nick1 === nick2)
        return true;
    // Contains check for abbreviation-style names ("CHA Hornets" vs "Charlotte Hornets")
    if (n1.includes(nick2) || n2.includes(nick1))
        return true;
    return false;
}
//# sourceMappingURL=team-matcher.js.map