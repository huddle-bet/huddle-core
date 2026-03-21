import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerRegistry, currentTeam } from '../player-registry.js';

describe('PlayerRegistry', () => {
  let reg: PlayerRegistry;

  beforeEach(() => {
    reg = new PlayerRegistry();
  });

  describe('getOrCreate basics', () => {
    it('creates a new player and returns it', () => {
      const p = reg.getOrCreate('nba', 'LeBron James');
      expect(p.name).toBe('LeBron James');
      expect(p.sport).toBe('nba');
      expect(p.id).toBeTruthy();
    });

    it('returns the same player on subsequent calls', () => {
      const p1 = reg.getOrCreate('nba', 'LeBron James');
      const p2 = reg.getOrCreate('nba', 'LeBron James');
      expect(p1.id).toBe(p2.id);
    });

    it('creates separate players for different sports', () => {
      const nba = reg.getOrCreate('nba', 'Chris Paul');
      const nhl = reg.getOrCreate('nhl', 'Chris Paul');
      expect(nba.id).not.toBe(nhl.id);
    });
  });

  describe('external ID resolution (trade-proof)', () => {
    it('resolves by external ID before name', () => {
      // DK registers player with external ID
      const p1 = reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99001', teamId: 'team-mil',
      });

      // Different book, same external ID, should get same player
      const p2 = reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99001',
      });
      expect(p2.id).toBe(p1.id);
    });

    it('external ID takes priority over name match', () => {
      // Register "Marcus Williams" on MIL
      const mil = reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99001', teamId: 'team-mil',
      });

      // Register a DIFFERENT "Marcus Williams" on SAC via different external ID
      const sac = reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99002', teamId: 'team-sac',
      });

      // Should be two different players
      expect(mil.id).not.toBe(sac.id);
      expect(reg.resolveAll('nba', 'Marcus Williams')).toHaveLength(2);
    });

    it('merges external IDs from different sources', () => {
      const fromDk = reg.getOrCreate('nba', 'LeBron James', {
        source: 'draftkings', externalId: 'dk:111',
      });
      const fromFd = reg.getOrCreate('nba', 'LeBron James', {
        source: 'fanduel', externalId: 'fd:222',
      });

      expect(fromDk.id).toBe(fromFd.id);
      expect(fromDk.externalIds).toHaveLength(2);
      expect(fromDk.externalIds).toContainEqual({ source: 'draftkings', id: 'dk:111' });
      expect(fromDk.externalIds).toContainEqual({ source: 'fanduel', id: 'fd:222' });
    });

    it('resolveByExternalId works after merge', () => {
      reg.getOrCreate('nba', 'LeBron James', { source: 'draftkings', externalId: 'dk:111' });
      reg.getOrCreate('nba', 'LeBron James', { source: 'fanduel', externalId: 'fd:222' });

      const byDk = reg.resolveByExternalId('draftkings', 'dk:111');
      const byFd = reg.resolveByExternalId('fanduel', 'fd:222');
      expect(byDk?.id).toBe(byFd?.id);
    });
  });

  describe('trade handling', () => {
    it('updates team history when player changes teams', () => {
      const p = reg.getOrCreate('nba', 'James Harden', {
        teamId: 'team-phi', date: '2025-10-01',
      });
      expect(currentTeam(p)).toBe('team-phi');

      // Trade to LAC
      reg.getOrCreate('nba', 'James Harden', {
        teamId: 'team-lac', date: '2026-02-06',
      });
      expect(currentTeam(p)).toBe('team-lac');
      expect(p.teamHistory).toHaveLength(2);
      expect(p.teamHistory[0].until).toBe('2026-02-06');
      expect(p.teamHistory[1].teamId).toBe('team-lac');
    });

    it('external ID survives team change', () => {
      // Register on PHI with a past date
      const p = reg.getOrCreate('nba', 'James Harden', {
        source: 'draftkings', externalId: 'dk:555', teamId: 'team-phi', date: '2025-10-01',
      });

      // Trade — same external ID, new team, later date
      const after = reg.getOrCreate('nba', 'James Harden', {
        source: 'draftkings', externalId: 'dk:555', teamId: 'team-lac', date: '2026-02-06',
      });

      expect(after.id).toBe(p.id); // same canonical UUID
      expect(currentTeam(after)).toBe('team-lac');
    });
  });

  describe('duplicate name disambiguation', () => {
    it('resolveByNameAndTeam finds correct player among duplicates', () => {
      // Two players with same name on different teams
      const mil = reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99001', teamId: 'team-mil',
      });
      const sac = reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99002', teamId: 'team-sac',
      });

      // getOrCreate with team context should find the right one
      const found = reg.getOrCreate('nba', 'Marcus Williams', {
        teamId: 'team-sac',
      });
      expect(found.id).toBe(sac.id);

      const foundMil = reg.getOrCreate('nba', 'Marcus Williams', {
        teamId: 'team-mil',
      });
      expect(foundMil.id).toBe(mil.id);
    });

    it('name-only fallback returns first match when no team context', () => {
      reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99001', teamId: 'team-mil',
      });
      reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99002', teamId: 'team-sac',
      });

      // No team context, no external ID — returns first registered
      const fallback = reg.getOrCreate('nba', 'Marcus Williams');
      expect(fallback).toBeTruthy();
      // Should not create a third player
      expect(reg.resolveAll('nba', 'Marcus Williams')).toHaveLength(2);
    });

    it('cross-source resolution: FD resolves same player DK already found', () => {
      // DK registers with external ID
      const fromDk = reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99001', teamId: 'team-mil',
      });

      // FD registers with different external ID but same name
      // Since there's only one "Marcus Williams" so far (from DK), name matches it
      const fromFd = reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'fanduel', externalId: 'fd:88001',
      });

      expect(fromFd.id).toBe(fromDk.id);
      expect(fromFd.externalIds).toHaveLength(2);
    });

    it('does not create duplicates when seeded from DB', () => {
      // Simulate DB seed: register player with known UUID and external IDs
      reg.register({
        id: 'known-uuid-123',
        name: 'LeBron James',
        sport: 'nba',
        teamHistory: [],
        externalIds: [
          { source: 'draftkings', id: 'dk:111' },
          { source: 'fanduel', id: 'fd:222' },
        ],
        aliases: [],
      });

      // Now getOrCreate with DK external ID should find the seeded player
      const p = reg.getOrCreate('nba', 'LeBron James', {
        source: 'draftkings', externalId: 'dk:111',
      });
      expect(p.id).toBe('known-uuid-123');

      // And by name
      const byName = reg.getOrCreate('nba', 'LeBron James');
      expect(byName.id).toBe('known-uuid-123');

      // No new players created
      expect(reg.all()).toHaveLength(1);
    });
  });

  describe('resolveAll', () => {
    it('returns empty array for unknown name', () => {
      expect(reg.resolveAll('nba', 'Nobody')).toHaveLength(0);
    });

    it('returns all players with same name', () => {
      reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99001',
      });
      reg.getOrCreate('nba', 'Marcus Williams', {
        source: 'draftkings', externalId: 'dk:99002',
      });

      const all = reg.resolveAll('nba', 'Marcus Williams');
      expect(all).toHaveLength(2);
      expect(all[0].id).not.toBe(all[1].id);
    });
  });
});
