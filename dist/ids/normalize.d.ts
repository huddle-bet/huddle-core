/**
 * Name normalization utilities for cross-source entity matching.
 */
/**
 * Normalize a team name for matching: fold diacritics, lowercase, strip common noise.
 *
 * The fold is what makes `Grêmio` and `Gremio` one team instead of two. huddle-data reads
 * HLTV, which spells clubs with their native diacritics; the DFS platforms huddle-odds
 * reads mostly do not. Both services derive team ids from this function — huddle-data via
 * `deterministicTeamId`, huddle-odds via `TeamRegistry.autoRegister` — so before the fold
 * one club got two ids, and the composite `canonical_event_id` built from them disagreed
 * across services for the same fixture.
 *
 * It folds diacritics and nothing else. `searchName` finishes by deleting every character
 * outside `[a-z0-9]`, which is correct there because it must match a Postgres generated
 * column byte for byte. Applied to team names it would fold every CJK and Cyrillic name to
 * the empty string and collapse all of them onto one id — measured, 7 dota and 3 valorant
 * teams reduce to '' that way.
 */
export declare function normalizeTeamName(name: string): string;
/**
 * Normalize a player name for matching.
 * Handles: "LeBron James", "L. James", "lebron james", "CoD: Shotzzy"
 */
export declare function normalizePlayerName(name: string): string;
/**
 * Generate a URL-safe slug from a name.
 * "Los Angeles Lakers" → "los-angeles-lakers"
 * "Natus Vincere" → "natus-vincere"
 */
export declare function slugify(name: string): string;
export declare function searchName(name: string): string;
//# sourceMappingURL=normalize.d.ts.map