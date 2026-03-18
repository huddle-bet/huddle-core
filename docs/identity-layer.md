# Identity Layer

huddle-core provides a unified entity identification system that resolves teams, players, and events across all data sources in the Huddle ecosystem.

## The Problem

The same team appears differently across every source:

| Source | Charlotte Hornets |
|--------|-------------------|
| ESPN | `Charlotte Hornets` (id: 30, abbr: CHA) |
| DraftKings | `CHA Hornets` |
| FanDuel | `Charlotte Hornets` |
| PrizePicks | `Charlotte Hornets` |

Players are worse — sportsbooks use "LeBron James", "L. James", or just "James". Esports players go by gamertags that vary by source.

## Architecture

```
@huddle/core
├── types/         Shared domain types (Sport, Team, Player, etc.)
├── ids/           Identity registries + normalization
│   ├── data/      Canonical team definitions (NBA, NHL, NFL, MLB, ...)
│   ├── normalize  Name normalization utilities
│   ├── TeamRegistry    Canonical team lookup
│   └── PlayerRegistry  Canonical player lookup (auto-discovering)
└── matchers/      Cross-source matching
    ├── team-matcher    Match team names across sources
    ├── player-matcher  Match player names across sources
    └── event-matcher   Match events by time + teams
```

## Team Registry

Central lookup for all canonical team data. Maps any source-specific name to a stable internal identity.

```typescript
import { TeamRegistry, NBA_TEAMS, NHL_TEAMS } from '@huddle/core';

const teams = new TeamRegistry();
teams.loadTeams(NBA_TEAMS);
teams.loadTeams(NHL_TEAMS);

// All resolve to the same team:
teams.resolve('nba', 'Charlotte Hornets');   // ESPN
teams.resolve('nba', 'CHA Hornets');         // DraftKings
teams.resolve('nba', 'CHA');                 // Abbreviation
teams.resolve('nba', 'Hornets');             // Short name
teams.fuzzyResolve('nba', 'GS Warriors');    // DK abbreviated

// Resolve by external system ID:
teams.resolveByExternalId('espn', '30');      // → Charlotte Hornets
```

### Team ID Format

Internal IDs are stable and deterministic:

```
{sport}:team:{slug}
```

Examples: `nba:team:hornets`, `nhl:team:maple-leafs`, `cs2:team:natus-vincere`

### Defining Teams

```typescript
import { defineTeam } from '@huddle/core';

const team = defineTeam({
  name: 'Charlotte Hornets',
  shortName: 'Hornets',
  abbreviation: 'CHA',
  sport: 'nba',
  externalIds: [
    { source: 'espn', id: '30' },
  ],
  aliases: ['cha hornets'],  // DraftKings variant
});
```

### Adding a New Sport

1. Create `src/ids/data/{sport}-teams.ts` with `defineTeam()` calls
2. Export from `src/ids/data/index.ts`
3. Add tests

## Player Registry

Auto-discovering registry that builds its index from ingested data. No pre-defined player list needed (though one can be loaded).

```typescript
import { PlayerRegistry } from '@huddle/core';

const players = new PlayerRegistry();

// Auto-discover from ingested data
const lebron = players.getOrCreate('nba', 'LeBron James', {
  source: 'espn',
  externalId: '1966',
  teamId: 'nba:team:lakers',
  position: 'SF',
});

// Later, from odds data:
players.getOrCreate('nba', 'LeBron James', {
  source: 'draftkings',
  externalId: 'dk-12345',
});
// → Returns same player, adds DK external ID

// Now both resolve:
players.resolve('nba', 'LeBron James');
players.resolveByExternalId('espn', '1966');
players.resolveByExternalId('draftkings', 'dk-12345');
// → All return the same Player
```

### Player ID Format

```
{sport}:player:{slug}
```

Examples: `nba:player:lebron-james`, `cs2:player:s1mple`

For esports players, the gamertag is used for the slug.

## Cross-Source Matching

### Team Matching

```typescript
import { teamsMatch, TeamRegistry, NBA_TEAMS } from '@huddle/core';

const reg = new TeamRegistry();
reg.loadTeams(NBA_TEAMS);

teamsMatch(reg, 'nba', 'Charlotte Hornets', 'CHA Hornets');  // true
teamsMatch(reg, 'nba', 'Miami Heat', 'MIA');                  // true
teamsMatch(reg, 'nba', 'Miami Heat', 'Charlotte Hornets');    // false
```

### Player Matching

```typescript
import { playersMatch, PlayerRegistry } from '@huddle/core';

const reg = new PlayerRegistry();

playersMatch(reg, 'nba', 'Norman Powell', 'N. Powell');       // true
playersMatch(reg, 'nba', 'LeBron James', 'lebron james');     // true
playersMatch(reg, 'nba', 'LeBron James', 'Kevin Durant');     // false
```

### Event Matching

Match events across sources (e.g., ESPN game ↔ DraftKings odds):

```typescript
import { matchEvents, TeamRegistry, NBA_TEAMS } from '@huddle/core';

const reg = new TeamRegistry();
reg.loadTeams(NBA_TEAMS);

const espnGames = [
  { id: 'espn:123', startTime: '2026-03-17T23:00Z', teams: ['Miami Heat', 'Charlotte Hornets'] },
];

const dkEvents = [
  { id: 'dk:456', startTime: '2026-03-17T23:10Z', teams: ['MIA Heat', 'CHA Hornets'] },
];

const matches = matchEvents(reg, 'nba', espnGames, dkEvents);
// → [{ event1: espnGames[0], event2: dkEvents[0] }]
```

## External IDs

Every entity tracks its IDs in all upstream systems:

```typescript
interface ExternalId {
  source: DataSource;  // 'espn' | 'draftkings' | 'fanduel' | 'hltv' | ...
  id: string;
}
```

This allows bidirectional lookup — given any source's ID, find the canonical entity; given a canonical entity, find all its source-specific IDs.

## Supported Sources

| Source | Type | Used For |
|--------|------|----------|
| `espn` | Match data | PBP, boxscores, scores |
| `gol.gg` | Match data | LoL matches |
| `hltv` | Match data | CS2 matches |
| `vlr.gg` | Match data | Valorant matches |
| `dltv` | Match data | Dota 2 matches |
| `bp.gg` | Match data | CoD matches |
| `blast.tv` | Match data | Rocket League matches |
| `draftkings` | Odds | Game lines, player props |
| `fanduel` | Odds | Game lines, player props |
| `prizepicks` | Odds | Player projections |
| `underdog` | Odds | Player over/unders |

## How Other Repos Use This

### huddle-data (ingestion)

```typescript
import { TeamRegistry, PlayerRegistry, ALL_TEAMS } from '@huddle/core';

const teams = new TeamRegistry();
teams.loadTeams(ALL_TEAMS);

// During ESPN ingest, resolve team to canonical ID
const team = teams.resolveByExternalId('espn', event.teams[0].id);
```

### odds-ingestion

```typescript
import { TeamRegistry, matchEvents, NBA_TEAMS } from '@huddle/core';

const teams = new TeamRegistry();
teams.loadTeams(NBA_TEAMS);

// Match DraftKings events to FanDuel events
const matched = matchEvents(teams, 'nba', dkEvents, fdEvents);
```
