/**
 * Name normalization utilities for cross-source entity matching.
 */

/** Normalize a team name for matching: lowercase, strip common noise */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize a player name for matching.
 * Handles: "LeBron James", "L. James", "lebron james", "CoD: Shotzzy"
 */
export function normalizePlayerName(name: string): string {
  return name
    .trim()
    // Strip esports game prefixes
    .replace(/^(CoD|Dota|Val|LoL|CS2?|CSGO):\s*/i, '')
    // Remove trailing Over/Under from selection labels
    .replace(/\s+(Over|Under|Higher|Lower)$/i, '')
    // Normalize unicode quotes/apostrophes
    .replace(/['']/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * Generate a URL-safe slug from a name.
 * "Los Angeles Lakers" → "los-angeles-lakers"
 * "Natus Vincere" → "natus-vincere"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
