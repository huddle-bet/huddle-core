import { isSport } from '../types/sports.js';
/**
 * Convert DB rows into Team objects for loading into a TeamRegistry.
 *
 * Usage:
 *   const { data: teams } = await supabase.from('teams').select();
 *   const { data: extIds } = await supabase.from('team_external_ids').select();
 *   const registry = new TeamRegistry();
 *   registry.loadTeams(teamsFromDbRows(teams, extIds));
 */
export function teamsFromDbRows(teamRows, externalIdRows) {
    // Group external IDs by team_id
    const extByTeam = new Map();
    for (const row of externalIdRows) {
        if (!extByTeam.has(row.team_id))
            extByTeam.set(row.team_id, []);
        extByTeam.get(row.team_id).push({
            source: row.source,
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
        sport: r.league_id,
        aliases: r.aliases ?? [],
        externalIds: extByTeam.get(r.id) ?? [],
    }));
}
//# sourceMappingURL=db-loader.js.map