import { describe, it, expect } from 'vitest';
import { normalizeTeamName, stripOrgSuffix, normalizePlayerName, searchName, slugify } from '../normalize.js';

describe('normalizeTeamName', () => {
  it('lowercases', () => {
    expect(normalizeTeamName('Los Angeles Lakers')).toBe('los angeles lakers');
  });

  it('strips straight quotes and periods', () => {
    expect(normalizeTeamName("O'Brien's")).toBe("obriens");
    expect(normalizeTeamName('St. Louis')).toBe('st louis');
  });

  it('collapses whitespace', () => {
    expect(normalizeTeamName('  New   York  ')).toBe('new york');
  });

  it('handles empty string', () => {
    expect(normalizeTeamName('')).toBe('');
  });

  // huddle-data reads HLTV, which spells clubs with their diacritics; the DFS platforms
  // huddle-odds reads mostly do not. Both derive team ids from this function, so an
  // unfolded name gave one club two ids and two disagreeing canonical_event_ids.
  it('folds diacritics so one club gets one id', () => {
    expect(normalizeTeamName('Grêmio')).toBe(normalizeTeamName('Gremio'));
    expect(normalizeTeamName('Honvéd')).toBe(normalizeTeamName('Honved'));
    expect(normalizeTeamName('KRÜ')).toBe(normalizeTeamName('KRU'));
    expect(normalizeTeamName('QUINTESSÊNCIA')).toBe(normalizeTeamName('QUINTESSENCIA'));
  });

  it('folds the diacritics NFD cannot decompose', () => {
    expect(normalizeTeamName('Ølgod')).toBe('olgod');
    expect(normalizeTeamName('Frøslev')).toBe('froslev');
  });

  // The fold must not reach for `searchName`, which ends by deleting everything outside
  // [a-z0-9]. That is right for a key mirroring a Postgres column and wrong here: it
  // reduces every CJK and Cyrillic name to '', collapsing all of them onto a single id.
  it('leaves non-Latin scripts intact rather than folding them to empty', () => {
    for (const name of ['剑来！', '植物驾到', '横揺れヤンキー', 'банда фляя']) {
      expect(normalizeTeamName(name)).not.toBe('');
    }
    const ids = new Set(
      ['剑来！', '植物驾到', '横揺れヤンキー', 'банда фляя'].map((n) => normalizeTeamName(n)),
    );
    expect(ids.size).toBe(4);
  });
});

// searchName mirrors the `players.search_name` generated column byte for byte. Splitting
// the fold out of it must not change a single result — a drift here mints a duplicate
// player id and drops that player's stats on every ingest cycle (ENG-232).
describe('searchName', () => {
  it('still matches immutable_unaccent + [^a-z0-9] removal', () => {
    expect(searchName('Frøslev')).toBe('froslev');
    expect(searchName('schnellÆ')).toBe('schnellae');
    expect(searchName('Luis García Jr.')).toBe('luisgarciajr');
    expect(searchName('José Ramírez')).toBe('joseramirez');
    expect(searchName("Shai Gilgeous-Alexander")).toBe('shaigilgeousalexander');
  });

  it('strips non-Latin scripts entirely, unlike normalizeTeamName', () => {
    expect(searchName('剑来！')).toBe('');
  });
});

describe('normalizePlayerName', () => {
  it('strips suffixes: Jr, Sr, II, III', () => {
    expect(normalizePlayerName('Jaren Jackson Jr.')).toBe('jaren jackson');
    expect(normalizePlayerName('Tim Hardaway Jr')).toBe('tim hardaway');
    expect(normalizePlayerName('Robert Williams III')).toBe('robert williams');
    expect(normalizePlayerName('Wendell Carter II')).toBe('wendell carter');
  });

  it('strips esports prefixes', () => {
    expect(normalizePlayerName('CoD: Shotzzy')).toBe('shotzzy');
    expect(normalizePlayerName('CS2: s1mple')).toBe('s1mple');
    expect(normalizePlayerName('LoL: Faker')).toBe('faker');
  });

  it('strips Over/Under line labels', () => {
    expect(normalizePlayerName('LeBron James Over 25.5')).toBe('lebron james');
    expect(normalizePlayerName('Nikola Jokic Under 10.5')).toBe('nikola jokic');
  });

  it('normalizes diacritics', () => {
    expect(normalizePlayerName('Luka Dončić')).toBe('luka doncic');
    expect(normalizePlayerName('Nikola Jokić')).toBe('nikola jokic');
  });

  it('normalizes unicode quotes to straight quotes', () => {
    // U+2019 → straight apostrophe (preserved in player names like De'Aaron)
    expect(normalizePlayerName("De\u2019Aaron Fox")).toBe("de'aaron fox");
  });

  it('strips parenthetical suffixes', () => {
    expect(normalizePlayerName('John Smith (GSW)')).toBe('john smith');
    expect(normalizePlayerName('Jane Doe (F)')).toBe('jane doe');
  });

  it('applies known aliases', () => {
    expect(normalizePlayerName('Alexandre Sarr')).toBe('alex sarr');
    expect(normalizePlayerName('Carlton Carrington')).toBe('bub carrington');
    expect(normalizePlayerName('Nicolas Claxton')).toBe('nic claxton');
  });

  it('handles empty string', () => {
    expect(normalizePlayerName('')).toBe('');
  });

  it('removes periods from initials', () => {
    expect(normalizePlayerName('P.J. Washington')).toBe('pj washington');
    expect(normalizePlayerName('O.G. Anunoby')).toBe('og anunoby');
  });
});

describe('slugify', () => {
  it('converts name to URL slug', () => {
    expect(slugify('Los Angeles Lakers')).toBe('los-angeles-lakers');
  });

  it('strips apostrophes and special chars', () => {
    expect(slugify("Natus Vincere")).toBe('natus-vincere');
    expect(slugify("O'Brien")).toBe('obrien');
  });

  it('collapses multiple separators', () => {
    expect(slugify('hello   world!!!')).toBe('hello-world');
  });

  it('strips leading/trailing dashes', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

/**
 * Added after one scoped CS2 poll created 18 teams, 15 of which were decorations of clubs
 * already in the table. Lives in core because both huddle-odds and huddle-data write
 * `teams` and both would otherwise mint the duplicates independently.
 */
describe('stripOrgSuffix', () => {
  it('strips the org-type words the sources actually append', () => {
    expect(stripOrgSuffix('nrg esports')).toBe('nrg');
    expect(stripOrgSuffix('sashi esport')).toBe('sashi');
    expect(stripOrgSuffix('lph gaming')).toBe('lph');
    expect(stripOrgSuffix('dendele cs')).toBe('dendele');
    expect(stripOrgSuffix('ww team')).toBe('ww');
    expect(stripOrgSuffix('inner circle esports')).toBe('inner circle');
  });

  it('refuses roster-tier words, which name separately-competing teams', () => {
    // Imperial / Imperial Academy / Imperial Valkyries are three real clubs. Collapsing
    // this class is the wrong-bridge defect that took a 47-canonical migration to undo.
    for (const n of ['imperial academy', 'imperial valkyries', 'mouz nxt', 'natus vincere junior',
                     'pain academy', 'mibr fe', 'spirit hu', 'ence prospects']) {
      expect(stripOrgSuffix(n), n).toBeNull();
    }
  });

  it('strips trailing only, so Team Liquid survives', () => {
    expect(stripOrgSuffix('team liquid')).toBeNull();
    expect(stripOrgSuffix('team spirit')).toBeNull();
    expect(stripOrgSuffix('team vitality')).toBeNull();
  });

  it('returns null for a single token, including a bare suffix word', () => {
    expect(stripOrgSuffix('astral')).toBeNull();
    expect(stripOrgSuffix('esports')).toBeNull();
    expect(stripOrgSuffix('')).toBeNull();
  });

  it('composes with normalizeTeamName, including the diacritic fold', () => {
    // The caller normalizes first, so the stripped key is comparable to a lookup key.
    expect(stripOrgSuffix(normalizeTeamName('Grêmio Esports'))).toBe('gremio');
  });
});
