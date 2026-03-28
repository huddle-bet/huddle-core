import { describe, it, expect, beforeEach } from 'vitest';
import { TeamRegistry } from '../../ids/team-registry.js';
import { PlayerRegistry, currentTeam, teamOnDate } from '../../ids/player-registry.js';
import { NBA_TEAMS } from '../../ids/data/nba-teams.js';
import { teamsMatch } from '../team-matcher.js';
import { playersMatch } from '../player-matcher.js';
import { matchEvents } from '../event-matcher.js';
describe('teamsMatch', () => {
    let reg;
    beforeEach(() => {
        reg = new TeamRegistry();
        reg.loadTeams(NBA_TEAMS);
    });
    it('matches ESPN vs DraftKings team names', () => {
        expect(teamsMatch(reg, 'nba', 'Charlotte Hornets', 'CHA Hornets')).toBe(true);
    });
    it('matches full name vs abbreviation', () => {
        expect(teamsMatch(reg, 'nba', 'Miami Heat', 'MIA')).toBe(true);
    });
    it('does not match different teams', () => {
        expect(teamsMatch(reg, 'nba', 'Miami Heat', 'Charlotte Hornets')).toBe(false);
    });
    it('matches Golden State variants', () => {
        expect(teamsMatch(reg, 'nba', 'Golden State Warriors', 'GS Warriors')).toBe(true);
    });
});
describe('playersMatch', () => {
    let reg;
    beforeEach(() => {
        reg = new PlayerRegistry();
    });
    it('matches exact names', () => {
        expect(playersMatch(reg, 'nba', 'LeBron James', 'LeBron James')).toBe(true);
    });
    it('matches case insensitively', () => {
        expect(playersMatch(reg, 'nba', 'LeBron James', 'lebron james')).toBe(true);
    });
    it('matches abbreviated first name', () => {
        expect(playersMatch(reg, 'nba', 'Norman Powell', 'N. Powell')).toBe(true);
    });
    it('does not match different players', () => {
        expect(playersMatch(reg, 'nba', 'LeBron James', 'Kevin Durant')).toBe(false);
    });
    it('matches via registry after getOrCreate', () => {
        reg.getOrCreate('nba', 'LeBron James', { source: 'espn', externalId: '1966' });
        reg.getOrCreate('nba', 'LeBron James', { source: 'draftkings', externalId: 'dk-123' });
        // Both resolve to same player
        const p1 = reg.resolveByExternalId('espn', '1966');
        const p2 = reg.resolveByExternalId('draftkings', 'dk-123');
        expect(p1?.id).toBe(p2?.id);
    });
    it('generates UUID IDs for players', () => {
        const p = reg.getOrCreate('nba', 'LeBron James');
        // UUID format: 8-4-4-4-12 hex chars
        expect(p.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
    it('tracks team history when player switches teams', () => {
        const seventySixersId = '1f86a645-dfe7-4253-bb2c-64ebf4df7ac9';
        const clippersId = 'af6bdf41-5904-44bc-995e-9beab1a63254';
        // Player on 76ers in early season
        const p1 = reg.getOrCreate('nba', 'James Harden', {
            teamId: seventySixersId,
            date: '2025-10-15',
            source: 'espn',
            externalId: '3992',
        });
        expect(currentTeam(p1)).toBe(seventySixersId);
        expect(p1.teamHistory).toHaveLength(1);
        // Same team later — no new stint
        reg.getOrCreate('nba', 'James Harden', {
            teamId: seventySixersId,
            date: '2025-11-20',
        });
        expect(p1.teamHistory).toHaveLength(1);
        // Traded to Clippers mid-season
        reg.getOrCreate('nba', 'James Harden', {
            teamId: clippersId,
            date: '2025-12-01',
        });
        expect(p1.teamHistory).toHaveLength(2);
        expect(currentTeam(p1)).toBe(clippersId);
        // Historical lookup — what team on Nov 20?
        expect(teamOnDate(p1, '2025-11-20')).toBe(seventySixersId);
        // Historical lookup — what team on Dec 15?
        expect(teamOnDate(p1, '2025-12-15')).toBe(clippersId);
        // The 76ers stint was closed
        expect(p1.teamHistory[0].until).toBe('2025-12-01');
    });
});
describe('matchEvents', () => {
    let reg;
    beforeEach(() => {
        reg = new TeamRegistry();
        reg.loadTeams(NBA_TEAMS);
    });
    it('matches events by team name and time', () => {
        const espnEvents = [
            { id: 'espn-1', startTime: '2026-03-17T23:00:00Z', teams: ['Miami Heat', 'Charlotte Hornets'] },
        ];
        const dkEvents = [
            { id: 'dk-1', startTime: '2026-03-17T23:10:00Z', teams: ['MIA Heat', 'CHA Hornets'] },
            { id: 'dk-2', startTime: '2026-03-17T23:00:00Z', teams: ['Boston Celtics', 'New York Knicks'] },
        ];
        const matches = matchEvents(reg, 'nba', espnEvents, dkEvents);
        expect(matches).toHaveLength(1);
        expect(matches[0].event2?.id).toBe('dk-1');
    });
    it('does not match events too far apart in time', () => {
        const espnEvents = [
            { id: 'espn-1', startTime: '2026-03-17T12:00:00Z', teams: ['Miami Heat'] },
        ];
        const dkEvents = [
            { id: 'dk-1', startTime: '2026-03-18T12:00:00Z', teams: ['Miami Heat'] },
        ];
        const matches = matchEvents(reg, 'nba', espnEvents, dkEvents);
        expect(matches[0].event2).toBeNull();
    });
});
//# sourceMappingURL=matchers.test.js.map