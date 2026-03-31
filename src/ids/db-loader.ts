import type { Team, DataSource, ExternalId } from '../types/entities.js';
import type { Sport } from '../types/sports.js';
import { isSport } from '../types/sports.js';

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
export function teamsFromDbRows(
  teamRows: DbTeamRow[],
  externalIdRows: DbTeamExternalIdRow[],
): Team[] {
  // Group external IDs by team_id
  const extByTeam = new Map<string, ExternalId[]>();
  for (const row of externalIdRows) {
    if (!extByTeam.has(row.team_id)) extByTeam.set(row.team_id, []);
    extByTeam.get(row.team_id)!.push({
      source: row.source as DataSource,
      id: row.external_id,
    });
  }

  return teamRows
    .filter((r) => isSport(r.league_id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.short_name ?? r.name.split(' ').pop() ?? r.name,
      abbreviation: r.abbreviation ?? r.name.slice(0, 3).toUpperCase(),
      sport: r.league_id as Sport,
      aliases: r.aliases ?? [],
      externalIds: extByTeam.get(r.id) ?? [],
    }));
}
