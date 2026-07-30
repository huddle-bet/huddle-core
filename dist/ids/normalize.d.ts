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
/**
 * JS mirror of the `players.search_name` generated column:
 *
 *   regexp_replace(public.immutable_unaccent(name), '[^a-z0-9]', '', 'g')
 *
 * where `immutable_unaccent(x) = lower(unaccent(x))`.
 *
 * This has to agree with Postgres **exactly**. `players` carries a partial
 * UNIQUE index on `(sport, search_name)`, and the auto-create path derives a
 * deterministic UUIDv5 from the same key. If JS computes a different key than
 * the column does, `resolvePlayerByName` misses an existing player, the
 * auto-create mints a fresh id, and the INSERT then collides with the row it
 * failed to find — a duplicate-key violation that drops the player's stats on
 * every ingest cycle (ENG-232).
 *
 * Lives in huddle-core because huddle-data and huddle-odds both need it and
 * both previously kept their own copy, which is how they drifted.
 */
export declare function searchName(name: string): string;
//# sourceMappingURL=normalize.d.ts.map