import { describe, it, expect } from 'vitest';
import { searchName } from '../normalize.js';

/**
 * These assertions encode the SQL contract, not a preference. `search_name` is
 * a GENERATED column:
 *
 *   regexp_replace(public.immutable_unaccent(name), '[^a-z0-9]', '', 'g')
 *   immutable_unaccent(x) = lower(unaccent(x))
 *
 * If a change here makes a case disagree with Postgres, the fix belongs in the
 * migration too — otherwise player lookups miss and the auto-create path
 * collides with the partial UNIQUE index on (sport, search_name).
 */
describe('searchName', () => {
  it('lowercases and strips punctuation and whitespace', () => {
    expect(searchName('Luis García Jr.')).toBe('luisgarciajr');
    expect(searchName('Viking Gustafsson-Nyberg')).toBe('vikinggustafssonnyberg');
    expect(searchName('Viking Gustafsson Nyberg')).toBe('vikinggustafssonnyberg');
    expect(searchName('M. Jones')).toBe('mjones');
    expect(searchName('M Jones')).toBe('mjones');
  });

  it('strips combining diacritics that NFD decomposes', () => {
    expect(searchName('Dončić')).toBe('doncic');
    expect(searchName('Nikola Jokić')).toBe('nikolajokic');
    expect(searchName('Peñarol')).toBe('penarol');
    expect(searchName('Åström')).toBe('astrom');
  });

  describe('characters NFD does not decompose — the ENG-232 bug', () => {
    // Each of these was a real production row whose DB search_name and JS key
    // disagreed, causing a duplicate-key violation on every ingest.
    it.each([
      ['Sagøy', 'sagoy'],
      ['Frøslev', 'froslev'],
      ['schnellÆ', 'schnellae'],
      ['gioØ2x', 'gioo2x'],
    ])('%s → %s (matches Postgres unaccent)', (input, expected) => {
      expect(searchName(input)).toBe(expected);
    });

    it.each([
      ['æ', 'ae'], ['Æ', 'ae'], ['œ', 'oe'], ['Œ', 'oe'],
      ['ø', 'o'], ['Ø', 'o'], ['ð', 'd'], ['Ð', 'd'],
      ['þ', 'th'], ['Þ', 'th'], ['ß', 'ss'],
      ['đ', 'd'], ['Đ', 'd'], ['ł', 'l'], ['Ł', 'l'],
      ['ħ', 'h'], ['ŋ', 'n'], ['ŧ', 't'], ['ı', 'i'], ['ĸ', 'k'],
    ])('folds %s to %s', (input, expected) => {
      expect(searchName(input)).toBe(expected);
    });

    it('handles a stroke character mid-name without dropping it', () => {
      // The old implementation deleted the ø, yielding 'lukaszfrslev'.
      expect(searchName('Łukasz Frøslev')).toBe('lukaszfroslev');
    });
  });

  it('returns empty string for all-punctuation names', () => {
    // The partial UNIQUE index excludes '' precisely so these do not all
    // collide with each other.
    expect(searchName('---')).toBe('');
    expect(searchName('...')).toBe('');
  });

  it('keeps digits, which are part of many esports handles', () => {
    expect(searchName('s1mple')).toBe('s1mple');
    expect(searchName('The1Iceman')).toBe('the1iceman');
    expect(searchName('gioØ2x')).toBe('gioo2x');
  });

  it('is idempotent — normalizing an already-normalized key is a no-op', () => {
    for (const n of ['Sagøy', 'Dončić', 'Luis García Jr.', 's1mple']) {
      expect(searchName(searchName(n))).toBe(searchName(n));
    }
  });
});
