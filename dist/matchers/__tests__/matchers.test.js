import { describe, it, expect, beforeEach } from 'vitest';
import { TeamRegistry } from '../../ids/team-registry.js';
import { NBA_TEAMS } from '../../ids/data/nba-teams.js';
import { teamsMatch } from '../team-matcher.js';
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