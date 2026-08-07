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
/**
 * `NRG Esports` -> `nrg`, when a source has decorated a club name.
 *
 * Returns the stripped key only. **The caller must look it up and accept the result only
 * if a team already exists under it.** That guard is the entire safety argument, and it is
 * why this is a resolver step rather than the suffix allowlist rejected earlier:
 *
 *   - it never mints a stripped id, so it cannot invent a club
 *   - a decoration on a name nobody holds falls through to auto-create unchanged
 *   - the strip is trailing-only, so `Team Liquid` and `Team Spirit` are untouched
 *
 * Lives here rather than in either service because both write teams. One scoped CS2 poll
 * created 18 rows, 15 of them decorations of clubs already in the table; huddle-data's
 * resolution order would mint all 15 the moment HLTV sent the same spellings. A guard in
 * one writer only is the shape of defect this repo keeps producing — ENG-492 fixed fuzzy
 * in one service and the other carried it for weeks.
 *
 * Input must already be normalized (`normalizeTeamName`), so the caller's lookup key and
 * this function's output are comparable.
 */
export declare function stripOrgSuffix(normalized: string): string | null;
//# sourceMappingURL=normalize.d.ts.map