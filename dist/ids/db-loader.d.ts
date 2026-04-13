import type { Team } from '../types/entities.js';
/**
 * DB row shape from `teams` table joined with `team_external_ids`.
 * Consumers query the DB and pass rows to `teamsFromDbRows()`.
 */
export interface DbTeamRow {
    id: string;
    name: string;
    short_name: string | null;
    abbreviation: string | null;
    league_id: string;
    aliases: string[] | null;
}
export interface DbTeamExternalIdRow {
    team_id: string;
    source: string;
    external_id: string;
}
/**
 * Convert DB rows into Team objects for loading into a TeamRegistry.
 *
 * Usage:
 *   const { data: teams } = await supabase.from('teams').select();
 *   const { data: extIds } = await supabase.from('team_external_ids').select();
 *   const registry = new TeamRegistry();
 *   registry.loadTeams(teamsFromDbRows(teams, extIds));
 */
export declare function teamsFromDbRows(teamRows: DbTeamRow[], externalIdRows: DbTeamExternalIdRow[]): Team[];
//# sourceMappingURL=db-loader.d.ts.map