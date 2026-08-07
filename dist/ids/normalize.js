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
export function normalizeTeamName(name) {
    return foldDiacritics(name)
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
 *
 * Split in two so `normalizeTeamName` can share the fold without the final
 * `[^a-z0-9]` strip — see the note on that function for why the strip is wrong
 * for team names.
 */
function foldDiacritics(name) {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[æœøðþßđħıĸłŋŧƒȷẞŉ]/g, (c) => UNACCENT_NON_DECOMPOSABLE[c] ?? c);
}
export function searchName(name) {
    return foldDiacritics(name).replace(/[^a-z0-9]/g, '');
}
/**
 * Words a source appends to an org's name without meaning a different club.
 *
 * Deliberately org-type words only. The ones that must NEVER be here denote a *separate
 * roster* — `academy`, `junior`, `nxt`, `prospects`, `fe` — and those are real, separately
 * competing teams. `teams` holds `Imperial`, `Imperial Academy` and `Imperial Valkyries`
 * as three rows, and collapsing that class is the wrong-bridge defect that took a
 * 47-canonical migration to undo.
 */
const ORG_SUFFIXES = new Set(['esports', 'esport', 'gaming', 'team', 'cs']);
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
export function stripOrgSuffix(normalized) {
    const parts = normalized.split(' ');
    if (parts.length < 2)
        return null;
    if (!ORG_SUFFIXES.has(parts[parts.length - 1].toLowerCase()))
        return null;
    return parts.slice(0, -1).join(' ');
}
//# sourceMappingURL=normalize.js.map