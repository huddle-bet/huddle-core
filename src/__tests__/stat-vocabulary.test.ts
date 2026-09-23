import { describe, it, expect } from 'vitest';
import { MARKET_TYPE_MAP, normalizeMarketType } from '../betting/market-types.js';

/**
 * ENG-464. `prop-matching.ts` used to carry its own 67-key stat map alongside the 203-key
 * one here. They overlapped on 37 keys and disagreed on 6, and the local one was largely
 * inert — it was fed already-normalised types, so its raw-form keys never matched.
 *
 * There is now one vocabulary. These are the properties that has to hold for that to be
 * safe, asserted rather than assumed.
 */

describe('one vocabulary', () => {
  /**
   * The load-bearing property. `canonicalStat` in the matcher receives `market.type`,
   * which the clients already normalised, and routes it through `normalizeMarketType`
   * again. If that were not idempotent, every prop would be re-mapped on the way into
   * matching and two books could diverge on the second pass.
   */
  it('normalizeMarketType is idempotent over every canonical output', () => {
    const outputs = [...new Set(Object.values(MARKET_TYPE_MAP))];
    const unstable = outputs.filter((o) => normalizeMarketType(o) !== o);
    expect(unstable).toEqual([]);
    expect(outputs.length).toBeGreaterThan(50);
  });

  it('normalising twice is the same as normalising once, for raw inputs too', () => {
    for (const raw of Object.keys(MARKET_TYPE_MAP)) {
      const once = normalizeMarketType(raw);
      expect(normalizeMarketType(once)).toBe(once);
    }
  });
});

/**
 * CS2 is best-of-three. "Maps 1-3" is therefore the whole match and correctly shares a
 * type with the unscoped stat; "maps 1-2" is a genuine subset at a different number and
 * must not. Collapsing them lets the matcher build a consensus line across two markets
 * that are not comparable, which is a false +EV signal rather than a missing one.
 */
describe('map-scoped esports stats', () => {
  it('keeps a two-map line distinct from the full match', () => {
    expect(normalizeMarketType('maps_1-2_kills')).toBe('kills_2map');
    expect(normalizeMarketType('kills_on_maps_1_2')).toBe('kills_2map');
    expect(normalizeMarketType('maps_1-2_kills')).not.toBe(normalizeMarketType('kills'));
  });

  it('does the same for headshots — this one used to collapse', () => {
    // Regression: both of these previously returned "headshots", the full-match type.
    expect(normalizeMarketType('maps_1-2_headshots')).toBe('headshots_2map');
    expect(normalizeMarketType('headshots_on_maps_1_2')).toBe('headshots_2map');
    expect(normalizeMarketType('maps_1-2_headshots')).not.toBe(normalizeMarketType('headshots'));
  });

  it('treats maps 1-3 as the full match, because in a Bo3 it is', () => {
    expect(normalizeMarketType('maps_1-3_kills')).toBe('kills');
    expect(normalizeMarketType('kills_on_maps_1_2_3')).toBe('kills');
    expect(normalizeMarketType('kills_on_game_1_2_3')).toBe('kills');
  });

  it('spells both books’ wording for the same two-map market identically', () => {
    // PrizePicks says "maps_1-2_kills", Underdog says "kills_on_maps_1_2". Same market.
    expect(normalizeMarketType('maps_1-2_kills')).toBe(normalizeMarketType('kills_on_maps_1_2'));
    expect(normalizeMarketType('maps_1-2_headshots')).toBe(
      normalizeMarketType('headshots_on_maps_1_2'),
    );
  });
});
