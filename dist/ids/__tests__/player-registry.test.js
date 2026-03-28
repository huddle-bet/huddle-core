import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerRegistry, currentTeam, teamOnDate } from '../player-registry.js';
import { normalizePlayerName } from '../normalize.js';
// ─── Name Normalization ────────────────────────────────────────────────────
describe('normalizePlayerName', () => {
    it('lowercases', () => {
        expect(normalizePlayerName('LeBron James')).toBe('lebron james');
    });
    it('strips Jr/Sr/II/III suffixes', () => {
        expect(normalizePlayerName('Derrick Jones Jr.')).toBe('derrick jones');
        expect(normalizePlayerName('Derrick Jones Jr')).toBe('derrick jones');
        expect(normalizePlayerName('Trey Murphy III')).toBe('trey murphy');
        expect(normalizePlayerName('Gary Payton II')).toBe('gary payton');
        expect(normalizePlayerName('Wendell Carter Jr.')).toBe('wendell carter');
        expect(normalizePlayerName('Kevin Porter Jr.')).toBe('kevin porter');
        expect(normalizePlayerName('Marvin Bagley III')).toBe('marvin bagley');
    });
    it('normalizes diacritics', () => {
        expect(normalizePlayerName('Luka Dončić')).toBe('luka doncic');
        expect(normalizePlayerName('Nikola Jokić')).toBe('nikola jokic');
        expect(normalizePlayerName('Jonas Valančiūnas')).toBe('jonas valanciunas');
    });
    it('strips periods from initials', () => {
        expect(normalizePlayerName('P.J. Washington')).toBe('pj washington');
        expect(normalizePlayerName('C.J. McCollum')).toBe('cj mccollum');
        expect(normalizePlayerName('R.J. Barrett')).toBe('rj barrett');
        // Without periods should match
        expect(normalizePlayerName('PJ Washington')).toBe('pj washington');
    });
    it('strips team abbreviation in parens', () => {
        expect(normalizePlayerName('Gui Santos (GSW)')).toBe('gui santos');
        expect(normalizePlayerName('Alex Sarr (WAS)')).toBe('alex sarr');
    });
    it('strips Over/Under + line from FD selection labels', () => {
        expect(normalizePlayerName('Aaron Wiggins Over 10.5')).toBe('aaron wiggins');
        expect(normalizePlayerName('LeBron James Under 25.5')).toBe('lebron james');
        expect(normalizePlayerName('Jayson Tatum Over')).toBe('jayson tatum');
        expect(normalizePlayerName('Chet Holmgren Higher 5.5')).toBe('chet holmgren');
    });
    it('strips esports game prefixes', () => {
        expect(normalizePlayerName('CoD: Shotzzy')).toBe('shotzzy');
        expect(normalizePlayerName('CS2: s1mple')).toBe('s1mple');
        expect(normalizePlayerName('LoL: Faker')).toBe('faker');
    });
    it('applies known aliases', () => {
        expect(normalizePlayerName('Alexandre Sarr')).toBe('alex sarr');
        expect(normalizePlayerName('Carlton Carrington')).toBe('bub carrington');
        expect(normalizePlayerName('Nicolas Claxton')).toBe('nic claxton');
        expect(normalizePlayerName('Herb Jones')).toBe('herbert jones');
        expect(normalizePlayerName('Tristan Silva')).toBe('tristan da silva');
    });
    it('normalizes unicode apostrophes', () => {
        expect(normalizePlayerName("De\u2019Aaron Fox")).toBe("de'aaron fox");
        expect(normalizePlayerName("Shai Gilgeous-Alexander")).toBe("shai gilgeous-alexander");
    });
    it('handles combined transformations', () => {
        // Jr + diacritics + periods
        expect(normalizePlayerName('P.J. Dončić Jr.')).toBe('pj doncic');
        // Alias + parens
        expect(normalizePlayerName('Alexandre Sarr (WAS)')).toBe('alex sarr');
        // Over + suffix
        expect(normalizePlayerName('Derrick Jones Jr. Over 12.5')).toBe('derrick jones');
    });
});
// ─── PlayerRegistry ────────────────────────────────────────────────────────
describe('PlayerRegistry', () => {
    let reg;
    beforeEach(() => {
        reg = new PlayerRegistry();
    });
    // --- Basics ---
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
        it('idempotent — 100 calls produce 1 player', () => {
            for (let i = 0; i < 100; i++) {
                reg.getOrCreate('nba', 'LeBron James', {
                    source: 'draftkings', externalId: 'dk:111',
                });
            }
            expect(reg.all().filter(p => p.sport === 'nba')).toHaveLength(1);
        });
    });
    // --- Resolution Order ---
    describe('resolution priority', () => {
        it('external ID takes priority over name', () => {
            const p1 = reg.getOrCreate('nba', 'LeBron James', {
                source: 'draftkings', externalId: 'dk:111',
            });
            // Same external ID, different name (typo/alias) — should still match
            const p2 = reg.getOrCreate('nba', 'Lebron James', {
                source: 'draftkings', externalId: 'dk:111',
            });
            expect(p2.id).toBe(p1.id);
        });
        it('name+team before plain name when duplicates exist', () => {
            const mil = reg.getOrCreate('nba', 'Marcus Williams', {
                source: 'draftkings', externalId: 'dk:99001', teamId: 'team-mil',
            });
            const sac = reg.getOrCreate('nba', 'Marcus Williams', {
                source: 'draftkings', externalId: 'dk:99002', teamId: 'team-sac',
            });
            // Team context should disambiguate
            const found = reg.getOrCreate('nba', 'Marcus Williams', { teamId: 'team-sac' });
            expect(found.id).toBe(sac.id);
            const foundMil = reg.getOrCreate('nba', 'Marcus Williams', { teamId: 'team-mil' });
            expect(foundMil.id).toBe(mil.id);
        });
        it('gamertag resolution for esports', () => {
            const p = reg.getOrCreate('cs2', 's1mple', { gamertag: 's1mple' });
            const byTag = reg.getOrCreate('cs2', 'Oleksandr Kostyliev', { gamertag: 's1mple' });
            expect(byTag.id).toBe(p.id);
        });
    });
    // --- Collision Guard ---
    describe('same-source collision guard', () => {
        it('different ID from same source = different player', () => {
            const p1 = reg.getOrCreate('nba', 'Marcus Williams', {
                source: 'draftkings', externalId: 'dk:99001', teamId: 'team-mil',
            });
            const p2 = reg.getOrCreate('nba', 'Marcus Williams', {
                source: 'draftkings', externalId: 'dk:99002', teamId: 'team-sac',
            });
            expect(p1.id).not.toBe(p2.id);
            expect(reg.resolveAll('nba', 'Marcus Williams')).toHaveLength(2);
        });
        it('same ID from same source = same player', () => {
            const p1 = reg.getOrCreate('nba', 'LeBron James', {
                source: 'draftkings', externalId: 'dk:111',
            });
            const p2 = reg.getOrCreate('nba', 'LeBron James', {
                source: 'draftkings', externalId: 'dk:111',
            });
            expect(p1.id).toBe(p2.id);
            expect(reg.all()).toHaveLength(1);
        });
        it('different ID from different source = same player (merge)', () => {
            const fromDk = reg.getOrCreate('nba', 'LeBron James', {
                source: 'draftkings', externalId: 'dk:111',
            });
            const fromPp = reg.getOrCreate('nba', 'LeBron James', {
                source: 'prizepicks', externalId: 'pp:222',
            });
            expect(fromPp.id).toBe(fromDk.id);
            expect(fromDk.externalIds).toHaveLength(2);
        });
        it('does not merge when existing player has different ID from same source', () => {
            // Player A: "s1mple" on DK with dk:100
            reg.getOrCreate('cs2', 's1mple', {
                source: 'draftkings', externalId: 'dk:100',
            });
            // Player B: different person also named "s1mple" (different scene) with dk:200
            const b = reg.getOrCreate('cs2', 's1mple', {
                source: 'draftkings', externalId: 'dk:200',
            });
            // Should create a second player
            expect(reg.resolveAll('cs2', 's1mple')).toHaveLength(2);
            expect(b.externalIds).toEqual([{ source: 'draftkings', id: 'dk:200' }]);
        });
    });
    // --- Cross-Source Merging ---
    describe('cross-source merging', () => {
        it('merges 5 sources onto one player', () => {
            const sources = [
                ['espn', 'espn:4567'],
                ['draftkings', 'dk:111'],
                ['fanduel', 'fd:222'],
                ['prizepicks', 'pp:333'],
                ['underdog', 'ud:444'],
            ];
            for (const [src, id] of sources) {
                reg.getOrCreate('nba', 'LeBron James', {
                    source: src, externalId: id,
                });
            }
            expect(reg.all()).toHaveLength(1);
            const p = reg.resolve('nba', 'LeBron James');
            expect(p.externalIds).toHaveLength(5);
        });
        it('resolveByExternalId works for all merged sources', () => {
            reg.getOrCreate('nba', 'LeBron James', { source: 'draftkings', externalId: 'dk:111' });
            reg.getOrCreate('nba', 'LeBron James', { source: 'espn', externalId: 'espn:4567' });
            expect(reg.resolveByExternalId('draftkings', 'dk:111')?.id)
                .toBe(reg.resolveByExternalId('espn', 'espn:4567')?.id);
        });
        it('name-only source merges with existing external-ID player', () => {
            // ESPN seeds "LeBron James" with an ID
            const seeded = reg.getOrCreate('nba', 'LeBron James', {
                source: 'espn', externalId: 'espn:123',
            });
            // BetMGM comes in with name only (no player ID)
            const mgm = reg.getOrCreate('nba', 'LeBron James');
            expect(mgm.id).toBe(seeded.id);
            // Still just 1 player
            expect(reg.all()).toHaveLength(1);
        });
    });
    // --- Name Normalization in Registry ---
    describe('normalized name matching', () => {
        it('Jr suffix does not create duplicate', () => {
            const withJr = reg.getOrCreate('nba', 'Derrick Jones Jr.');
            const without = reg.getOrCreate('nba', 'Derrick Jones');
            expect(without.id).toBe(withJr.id);
        });
        it('diacritics do not create duplicate', () => {
            const with_ = reg.getOrCreate('nba', 'Luka Dončić');
            const without = reg.getOrCreate('nba', 'Luka Doncic');
            expect(without.id).toBe(with_.id);
        });
        it('periods in initials do not create duplicate', () => {
            const with_ = reg.getOrCreate('nba', 'P.J. Washington');
            const without = reg.getOrCreate('nba', 'PJ Washington');
            expect(without.id).toBe(with_.id);
        });
        it('alias maps correctly', () => {
            const espn = reg.getOrCreate('nba', 'Alex Sarr', { source: 'espn', externalId: 'espn:1' });
            const dk = reg.getOrCreate('nba', 'Alexandre Sarr', { source: 'draftkings', externalId: 'dk:2' });
            expect(dk.id).toBe(espn.id);
        });
        it('team parens stripped for matching', () => {
            const base = reg.getOrCreate('nba', 'Gui Santos');
            const withParens = reg.getOrCreate('nba', 'Gui Santos (GSW)');
            expect(withParens.id).toBe(base.id);
        });
        it('FD selection label matches base name', () => {
            const base = reg.getOrCreate('nba', 'LeBron James');
            const fdLabel = reg.getOrCreate('nba', 'LeBron James Over 25.5');
            expect(fdLabel.id).toBe(base.id);
        });
    });
    // --- Trade Handling ---
    describe('trade handling', () => {
        it('updates team history on trade', () => {
            const p = reg.getOrCreate('nba', 'James Harden', {
                teamId: 'team-phi', date: '2025-10-01',
            });
            expect(currentTeam(p)).toBe('team-phi');
            reg.getOrCreate('nba', 'James Harden', {
                teamId: 'team-lac', date: '2026-02-06',
            });
            expect(currentTeam(p)).toBe('team-lac');
            expect(p.teamHistory).toHaveLength(2);
            expect(p.teamHistory[0].until).toBe('2026-02-06');
        });
        it('external ID survives team change', () => {
            const p = reg.getOrCreate('nba', 'James Harden', {
                source: 'draftkings', externalId: 'dk:555', teamId: 'team-phi', date: '2025-10-01',
            });
            const after = reg.getOrCreate('nba', 'James Harden', {
                source: 'draftkings', externalId: 'dk:555', teamId: 'team-lac', date: '2026-02-06',
            });
            expect(after.id).toBe(p.id);
            expect(currentTeam(after)).toBe('team-lac');
        });
        it('does not backdate team history', () => {
            const p = reg.getOrCreate('nba', 'Test Player', {
                teamId: 'team-b', date: '2026-03-01',
            });
            // Earlier date — should be ignored
            reg.getOrCreate('nba', 'Test Player', {
                teamId: 'team-a', date: '2025-10-01',
            });
            expect(currentTeam(p)).toBe('team-b');
            expect(p.teamHistory).toHaveLength(1);
        });
        it('same team observation is idempotent', () => {
            reg.getOrCreate('nba', 'Test Player', { teamId: 'team-a', date: '2025-10-01' });
            reg.getOrCreate('nba', 'Test Player', { teamId: 'team-a', date: '2025-11-01' });
            reg.getOrCreate('nba', 'Test Player', { teamId: 'team-a', date: '2025-12-01' });
            const p = reg.resolve('nba', 'Test Player');
            expect(p.teamHistory).toHaveLength(1);
        });
        it('teamOnDate resolves correctly', () => {
            const p = reg.getOrCreate('nba', 'James Harden', {
                teamId: 'team-phi', date: '2025-10-01',
            });
            reg.getOrCreate('nba', 'James Harden', {
                teamId: 'team-lac', date: '2026-02-06',
            });
            expect(teamOnDate(p, '2025-12-01')).toBe('team-phi');
            expect(teamOnDate(p, '2026-03-01')).toBe('team-lac');
            expect(teamOnDate(p, '2025-09-01')).toBeUndefined();
        });
    });
    // --- DB Seeding ---
    describe('DB seeding simulation', () => {
        it('seeded player found by external ID', () => {
            reg.register({
                id: 'known-uuid-123', name: 'LeBron James', sport: 'nba',
                teamHistory: [], externalIds: [
                    { source: 'draftkings', id: 'dk:111' },
                    { source: 'espn', id: 'espn:2544' },
                ], aliases: [],
            });
            const found = reg.getOrCreate('nba', 'LeBron James', {
                source: 'draftkings', externalId: 'dk:111',
            });
            expect(found.id).toBe('known-uuid-123');
        });
        it('seeded player found by name', () => {
            reg.register({
                id: 'known-uuid-123', name: 'LeBron James', sport: 'nba',
                teamHistory: [], externalIds: [], aliases: [],
            });
            expect(reg.getOrCreate('nba', 'LeBron James').id).toBe('known-uuid-123');
        });
        it('new external ID merged onto seeded player', () => {
            reg.register({
                id: 'known-uuid-123', name: 'LeBron James', sport: 'nba',
                teamHistory: [], externalIds: [{ source: 'espn', id: 'espn:2544' }],
                aliases: [],
            });
            reg.getOrCreate('nba', 'LeBron James', {
                source: 'prizepicks', externalId: 'pp:777',
            });
            const p = reg.get('known-uuid-123');
            expect(p.externalIds).toHaveLength(2);
            expect(p.externalIds).toContainEqual({ source: 'prizepicks', id: 'pp:777' });
        });
        it('no duplicates after seeding + polling', () => {
            // Simulate: DB has 3 players seeded
            reg.register({
                id: 'uuid-lebron', name: 'LeBron James', sport: 'nba',
                teamHistory: [], externalIds: [{ source: 'espn', id: 'espn:1' }], aliases: [],
            });
            reg.register({
                id: 'uuid-kd', name: 'Kevin Durant', sport: 'nba',
                teamHistory: [], externalIds: [{ source: 'espn', id: 'espn:2' }], aliases: [],
            });
            reg.register({
                id: 'uuid-curry', name: 'Stephen Curry', sport: 'nba',
                teamHistory: [], externalIds: [{ source: 'espn', id: 'espn:3' }], aliases: [],
            });
            // Simulate polling: DK, PP, UD each register the same 3 players
            for (const [src, prefix] of [['draftkings', 'dk'], ['prizepicks', 'pp'], ['underdog', 'ud']]) {
                reg.getOrCreate('nba', 'LeBron James', { source: src, externalId: `${prefix}:1` });
                reg.getOrCreate('nba', 'Kevin Durant', { source: src, externalId: `${prefix}:2` });
                reg.getOrCreate('nba', 'Stephen Curry', { source: src, externalId: `${prefix}:3` });
            }
            expect(reg.all().filter(p => p.sport === 'nba')).toHaveLength(3);
            const lebron = reg.get('uuid-lebron');
            expect(lebron.externalIds).toHaveLength(4); // espn + dk + pp + ud
        });
    });
    // --- Esports ---
    describe('esports gamertags', () => {
        it('gamertag is primary identifier', () => {
            const p1 = reg.getOrCreate('cs2', 's1mple', { gamertag: 's1mple' });
            const p2 = reg.getOrCreate('cs2', 's1mple', { gamertag: 's1mple' });
            expect(p1.id).toBe(p2.id);
        });
        it('real name resolves via gamertag', () => {
            reg.getOrCreate('cs2', 's1mple', {
                gamertag: 's1mple', source: 'hltv', externalId: 'hltv:7998',
            });
            // PP uses gamertag as the name directly
            const fromPP = reg.getOrCreate('cs2', 's1mple', {
                source: 'prizepicks', externalId: 'pp:50001',
            });
            expect(fromPP.externalIds).toHaveLength(2);
            expect(reg.all().filter(p => p.sport === 'cs2')).toHaveLength(1);
        });
        it('different gamertags in same game are different players', () => {
            reg.getOrCreate('cs2', 's1mple', { gamertag: 's1mple', source: 'hltv', externalId: 'hltv:7998' });
            reg.getOrCreate('cs2', 'NiKo', { gamertag: 'NiKo', source: 'hltv', externalId: 'hltv:3741' });
            expect(reg.all().filter(p => p.sport === 'cs2')).toHaveLength(2);
        });
        it('same gamertag in different games are different players', () => {
            const cs2 = reg.getOrCreate('cs2', 'Lucky', { gamertag: 'Lucky' });
            const val = reg.getOrCreate('valorant', 'Lucky', { gamertag: 'Lucky' });
            expect(cs2.id).not.toBe(val.id);
        });
    });
    // --- Multi-Book Simulation ---
    describe('full polling simulation', () => {
        it('5-book NBA polling produces correct canonical count', () => {
            // Seed from ESPN (3 games = ~30 players)
            const espnPlayers = [
                'LeBron James', 'Anthony Davis', 'Austin Reaves',
                'Jayson Tatum', 'Jaylen Brown', 'Derrick White',
                'Nikola Jokic', 'Jamal Murray', 'Aaron Gordon',
                'Shai Gilgeous-Alexander', 'Chet Holmgren', 'Jalen Williams',
            ];
            for (let i = 0; i < espnPlayers.length; i++) {
                reg.getOrCreate('nba', espnPlayers[i], {
                    source: 'espn', externalId: `espn:${i + 1}`,
                    teamId: `team-${i % 4}`, date: '2026-03-20',
                });
            }
            // DK polls with player IDs
            for (let i = 0; i < espnPlayers.length; i++) {
                reg.getOrCreate('nba', espnPlayers[i], {
                    source: 'draftkings', externalId: `dk:${i + 100}`,
                });
            }
            // FD polls with no player IDs (name-only)
            for (const name of espnPlayers) {
                reg.getOrCreate('nba', name);
            }
            // PP polls with player IDs
            for (let i = 0; i < espnPlayers.length; i++) {
                reg.getOrCreate('nba', espnPlayers[i], {
                    source: 'prizepicks', externalId: `pp:${i + 200}`,
                });
            }
            // UD polls with player IDs
            for (let i = 0; i < espnPlayers.length; i++) {
                reg.getOrCreate('nba', espnPlayers[i], {
                    source: 'underdog', externalId: `ud:${i + 300}`,
                });
            }
            // MGM polls with name only
            for (const name of espnPlayers) {
                reg.getOrCreate('nba', name);
            }
            // Should still be exactly 12 players
            const nbaPlayers = reg.all().filter(p => p.sport === 'nba');
            expect(nbaPlayers).toHaveLength(espnPlayers.length);
            // Each should have 4 external IDs (espn + dk + pp + ud)
            for (const p of nbaPlayers) {
                expect(p.externalIds).toHaveLength(4);
            }
        });
        it('handles name variants across books', () => {
            // ESPN uses "Alex Sarr"
            reg.getOrCreate('nba', 'Alex Sarr', { source: 'espn', externalId: 'espn:100' });
            // DK uses "Alexandre Sarr" — alias should map to same player
            reg.getOrCreate('nba', 'Alexandre Sarr', { source: 'draftkings', externalId: 'dk:100' });
            // PP uses "Alex Sarr"
            reg.getOrCreate('nba', 'Alex Sarr', { source: 'prizepicks', externalId: 'pp:100' });
            const players = reg.all().filter(p => p.sport === 'nba');
            expect(players).toHaveLength(1);
            expect(players[0].externalIds).toHaveLength(3);
        });
        it('handles suffix variants across books', () => {
            reg.getOrCreate('nba', 'Derrick Jones Jr.', { source: 'fanduel', externalId: 'fd:50' });
            reg.getOrCreate('nba', 'Derrick Jones', { source: 'prizepicks', externalId: 'pp:50' });
            reg.getOrCreate('nba', 'Derrick Jones Jr', { source: 'underdog', externalId: 'ud:50' });
            expect(reg.all().filter(p => p.sport === 'nba')).toHaveLength(1);
        });
    });
    // --- Edge Cases ---
    describe('edge cases', () => {
        it('empty name does not crash', () => {
            const p = reg.getOrCreate('nba', '');
            expect(p.id).toBeTruthy();
        });
        it('register then getOrCreate returns registered player', () => {
            reg.register({
                id: 'pre-existing', name: 'Test Player', sport: 'nba',
                teamHistory: [], externalIds: [], aliases: [],
            });
            const p = reg.getOrCreate('nba', 'Test Player');
            expect(p.id).toBe('pre-existing');
        });
        it('byTeam returns correct players', () => {
            reg.getOrCreate('nba', 'Player A', { teamId: 'team-1', date: '2026-01-01' });
            reg.getOrCreate('nba', 'Player B', { teamId: 'team-1', date: '2026-01-01' });
            reg.getOrCreate('nba', 'Player C', { teamId: 'team-2', date: '2026-01-01' });
            expect(reg.byTeam('team-1')).toHaveLength(2);
            expect(reg.byTeam('team-2')).toHaveLength(1);
            expect(reg.byTeam('team-3')).toHaveLength(0);
        });
        it('bySport filters correctly', () => {
            reg.getOrCreate('nba', 'Player A');
            reg.getOrCreate('nhl', 'Player B');
            reg.getOrCreate('nba', 'Player C');
            expect(reg.bySport('nba')).toHaveLength(2);
            expect(reg.bySport('nhl')).toHaveLength(1);
            expect(reg.bySport('mlb')).toHaveLength(0);
        });
        it('resolveAll returns empty for unknown', () => {
            expect(reg.resolveAll('nba', 'Nobody')).toHaveLength(0);
        });
        it('get returns undefined for unknown ID', () => {
            expect(reg.get('nonexistent')).toBeUndefined();
        });
        it('resolveByExternalId returns undefined for unknown', () => {
            expect(reg.resolveByExternalId('draftkings', 'unknown')).toBeUndefined();
        });
    });
});
//# sourceMappingURL=player-registry.test.js.map