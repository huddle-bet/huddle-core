export const DOTA2_PRO_LEAGUES = [
    { id: 19543, name: 'PGL Wallachia 2026 Season 8' },
    { id: 19532, name: 'DreamLeague Division 2 Season 4' },
    { id: 19575, name: 'ESL Challenger China' },
    { id: 18866, name: 'European Pro League 2025-2026 Season' },
    { id: 18865, name: 'EPL World Series: Southeast Asia 2025-2026 Season' },
];
/** Fast membership check by league_id. */
export const DOTA2_PRO_LEAGUE_IDS = new Set(DOTA2_PRO_LEAGUES.map((l) => l.id));
//# sourceMappingURL=dota2-leagues.js.map