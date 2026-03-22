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
 * Known name variations across sources.
 * Key = normalized variant → value = canonical form.
 * Only add entries where the same real-world person has different names across sources.
 */
const NAME_ALIASES: Record<string, string> = {
  // Legal name → ESPN/common name
  "alexandre sarr": "alex sarr",
  "carlton carrington": "bub carrington",
  "nicolas claxton": "nic claxton",
  "herb jones": "herbert jones",
  // "da silva" vs "silva" — PP strips "da"
  "tristan silva": "tristan da silva",
};

/**
 * Normalize a player name for matching.
 * Handles: "LeBron James", "L. James", "lebron james", "CoD: Shotzzy"
 */
export function normalizePlayerName(name: string): string {
  let normalized = name
    .trim()
    // Strip esports game prefixes
    .replace(/^(CoD|Dota|Val|LoL|CS2?|CSGO):\s*/i, '')
    // Remove trailing Over/Under + optional line from selection labels
    .replace(/\s+(Over|Under|Higher|Lower)(\s+[\d.]+)?$/i, '')
    // Normalize unicode quotes/apostrophes (U+2018, U+2019, U+02BC)
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    // Normalize diacritics (Dončić → Doncic)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Normalize periods in initials (P.J. → pj for matching)
    .replace(/\./g, '')
    // Strip name suffixes — Jr, Jr., Sr, II, III, IV (books inconsistently include these)
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv|v)\s*$/i, '')
    // Strip parenthetical suffixes: team abbrev "(GSW)", position "(F)", birth year "(1998)"
    .replace(/\s*\([^)]{1,10}\)\s*$/, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

  // Apply known aliases
  return NAME_ALIASES[normalized] ?? normalized;
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
