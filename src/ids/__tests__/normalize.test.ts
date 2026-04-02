import { describe, it, expect } from 'vitest';
import { normalizeTeamName, normalizePlayerName, slugify } from '../normalize.js';

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
