/**
 * Name normalization utilities for cross-source entity matching.
 */
/** Normalize a team name for matching: lowercase, strip common noise */
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
//# sourceMappingURL=normalize.d.ts.map