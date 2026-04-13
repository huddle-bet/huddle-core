import { describe, it, expect } from 'vitest';
import { teamsFromDbRows } from '../db-loader.js';
describe('teamsFromDbRows', () => {
    const teamRows = [
        { id: 'lakers', name: 'Los Angeles Lakers', short_name: 'Lakers', abbreviation: 'LAL', league_id: 'nba', aliases: ['LA Lakers'] },
        { id: 'celtics', name: 'Boston Celtics', short_name: null, abbreviation: null, league_id: 'nba', aliases: null },
        { id: 'invalid', name: 'Unknown Team', short_name: null, abbreviation: null, league_id: 'badleague', aliases: null },
    ];
    const extIdRows = [
        { team_id: 'lakers', source: 'espn', external_id: '13' },
        { team_id: 'lakers', source: 'draftkings', external_id: 'lal-dk-123' },
        { team_id: 'celtics', source: 'espn', external_id: '2' },
    ];
    it('converts rows to Team objects', () => {
        const teams = teamsFromDbRows(teamRows, extIdRows);
        expect(teams).toHaveLength(2); // 'badleague' filtered out
    });
    it('maps all fields correctly', () => {
        const teams = teamsFromDbRows(teamRows, extIdRows);
        const lakers = teams.find((t) => t.id === 'lakers');
        expect(lakers.name).toBe('Los Angeles Lakers');
        expect(lakers.shortName).toBe('Lakers');
        expect(lakers.abbreviation).toBe('LAL');
        expect(lakers.sport).toBe('nba');
        expect(lakers.aliases).toEqual(['LA Lakers']);
    });
    it('attaches external IDs', () => {
        const teams = teamsFromDbRows(teamRows, extIdRows);
        const lakers = teams.find((t) => t.id === 'lakers');
        expect(lakers.externalIds).toHaveLength(2);
        expect(lakers.externalIds).toContainEqual({ source: 'espn', id: '13' });
        expect(lakers.externalIds).toContainEqual({ source: 'draftkings', id: 'lal-dk-123' });
    });
    it('defaults shortName from last word of name', () => {
        const teams = teamsFromDbRows(teamRows, extIdRows);
        const celtics = teams.find((t) => t.id === 'celtics');
        expect(celtics.shortName).toBe('Celtics');
    });
    it('defaults abbreviation from first 3 chars', () => {
        const teams = teamsFromDbRows(teamRows, extIdRows);
        const celtics = teams.find((t) => t.id === 'celtics');
        expect(celtics.abbreviation).toBe('BOS');
    });
    it('filters out non-sport league IDs', () => {
        const teams = teamsFromDbRows(teamRows, extIdRows);
        expect(teams.find((t) => t.id === 'invalid')).toBeUndefined();
    });
    it('handles empty inputs', () => {
        expect(teamsFromDbRows([], [])).toEqual([]);
    });
    it('handles teams with no external IDs', () => {
        const teams = teamsFromDbRows(teamRows, []);
        expect(teams[0].externalIds).toEqual([]);
    });
});
//# sourceMappingURL=db-loader.test.js.map