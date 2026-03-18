import { describe, it, expect, beforeEach } from 'vitest';
import { TeamRegistry } from '../team-registry.js';
import { NBA_TEAMS } from '../data/nba-teams.js';
import { NHL_TEAMS } from '../data/nhl-teams.js';

describe('TeamRegistry', () => {
  let reg: TeamRegistry;

  beforeEach(() => {
    reg = new TeamRegistry();
    reg.loadTeams(NBA_TEAMS);
    reg.loadTeams(NHL_TEAMS);
  });

  describe('resolve', () => {
    it('resolves by full name', () => {
      const team = reg.resolve('nba', 'Charlotte Hornets');
      expect(team?.abbreviation).toBe('CHA');
      expect(team?.id).toBe('5f88a428-87ac-4296-81f8-7bc22777036f');
    });

    it('resolves by abbreviation', () => {
      const team = reg.resolve('nba', 'CHA');
      expect(team?.name).toBe('Charlotte Hornets');
    });

    it('resolves by short name', () => {
      const team = reg.resolve('nba', 'Hornets');
      expect(team?.name).toBe('Charlotte Hornets');
    });

    it('resolves DraftKings-style names', () => {
      const team = reg.resolve('nba', 'cha hornets');
      expect(team?.name).toBe('Charlotte Hornets');
    });

    it('resolves case-insensitively', () => {
      const team = reg.resolve('nba', 'CHARLOTTE HORNETS');
      expect(team?.name).toBe('Charlotte Hornets');
    });

    it('returns undefined for unknown teams', () => {
      expect(reg.resolve('nba', 'Nonexistent Team')).toBeUndefined();
    });

    it('all variants resolve to the same UUID', () => {
      const byFull = reg.resolve('nba', 'Charlotte Hornets');
      const byShort = reg.resolve('nba', 'Hornets');
      const byAbbr = reg.resolve('nba', 'CHA');
      const byAlias = reg.resolve('nba', 'cha hornets');
      expect(byFull?.id).toBe(byShort?.id);
      expect(byShort?.id).toBe(byAbbr?.id);
      expect(byAbbr?.id).toBe(byAlias?.id);
    });
  });

  describe('resolveByExternalId', () => {
    it('resolves by ESPN ID', () => {
      const team = reg.resolveByExternalId('espn', '30');
      expect(team?.name).toBe('Charlotte Hornets');
    });
  });

  describe('fuzzyResolve', () => {
    it('matches DraftKings abbreviated names', () => {
      const team = reg.fuzzyResolve('nba', 'GS Warriors');
      expect(team?.abbreviation).toBe('GSW');
    });

    it('matches partial names by nickname', () => {
      const team = reg.fuzzyResolve('nba', 'LA Clippers');
      expect(team?.name).toBe('Los Angeles Clippers');
    });

    it('does not cross sports', () => {
      // "Kings" exists in both NBA (Sacramento) and NHL (LA)
      const nba = reg.resolve('nba', 'Kings');
      const nhl = reg.resolve('nhl', 'Kings');
      expect(nba?.name).toBe('Sacramento Kings');
      expect(nhl?.name).toBe('Los Angeles Kings');
    });
  });

  describe('bySport', () => {
    it('returns all NBA teams', () => {
      expect(reg.bySport('nba')).toHaveLength(30);
    });

    it('returns all NHL teams', () => {
      expect(reg.bySport('nhl')).toHaveLength(32);
    });
  });
});
