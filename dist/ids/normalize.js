/**
 * Name normalization utilities for cross-source entity matching.
 */
/** Normalize a team name for matching: lowercase, strip common noise */
export function normalizeTeamName(name) {
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
const NAME_ALIASES = {
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
export function normalizePlayerName(name) {
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
export function slugify(name) {
    return name
        .toLowerCase()
        .replace(/['']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
/**
 * Characters Postgres's `unaccent` folds to ASCII but Unicode NFD does **not**
 * decompose. NFD only splits precomposed base+combining-mark pairs (é → e + ´),
 * so letters whose diacritic is a stroke, bar, or ligature survive it intact —
 * and then get deleted outright by the `[^a-z0-9]` filter.
 *
 * That deletion is what makes JS and SQL disagree:
 *
 *   "Frøslev"  → Postgres "froslev"   JS (without this map) "frslev"
 *   "schnellÆ" → Postgres "schnellae" JS (without this map) "schnell"
 *
 * Keys are lowercase because `searchName` folds case before substituting.
 * Values mirror PostgreSQL's stock `unaccent.rules`.
 */
const UNACCENT_NON_DECOMPOSABLE = {
    'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'ð': 'd', 'þ': 'th', 'ß': 'ss',
    'đ': 'd', 'ħ': 'h', 'ı': 'i', 'ĸ': 'k', 'ł': 'l', 'ŋ': 'n',
    'ŧ': 't', 'ƒ': 'f', 'ȷ': 'j', 'ẞ': 'ss', 'ŉ': 'n',
};
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
export function searchName(name) {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[æœøðþßđħıĸłŋŧƒȷẞŉ]/g, (c) => UNACCENT_NON_DECOMPOSABLE[c] ?? c)
        .replace(/[^a-z0-9]/g, '');
}
//# sourceMappingURL=normalize.js.map