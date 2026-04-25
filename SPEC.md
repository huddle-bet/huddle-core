# huddle-core — SPEC

**Status:** Shared identity + routing library. Imported by huddle-data, huddle-odds, huddle-live, huddle-engine.
**Owner:** Cam

## Purpose

huddle-core is the ID backbone. It turns every source's messy names ("CHA Hornets", "Miami Heat", "L. James") into a single canonical ID that lets the rest of the system join across tables. It also holds the static routing config — which league uses which provider — so that lives in one place, not duplicated across services.

Zero runtime dependencies. Published to GitHub Packages as `@huddle-bet/core`. Pulled fresh on each Docker build.

## What it exports

| Import path | What's there |
|---|---|
| `@huddle-bet/core` (main) | Re-exports everything below |
| `.../types` | `Sport`, `Team`, `Player`, `GameEvent`, `DataSource` enums + branded ID types |
| `.../ids` | `TeamRegistry`, `PlayerRegistry`, name normalizers, `ALL_TEAMS` |
| `.../matchers` | `teamsMatch`, `playersMatch`, `matchEvents` |
| `.../canonical` | `canonicalEventId(sport, date, teamAId, teamBId)` |
| `.../drift` | `logTeamDrift`, `logPlayerDrift` — observability for misses |
| `.../config/leagues` | `LEAGUE_PROVIDERS` — per-league provider routing |

## Canonical event ID

Every table that describes a game carries a `canonical_event_id`. It's the SHA-based join key across huddle-data, huddle-live, huddle-odds, and huddle-engine.

```
canonicalEventId('nba', '2026-03-17', 'nba:team:heat', 'nba:team:hornets')
→ 'nba:2026-03-17:heat-hornets'
```

Same inputs always produce the same ID, regardless of source. That's the entire join contract.

## TeamRegistry

Central lookup: any source-specific name or external ID → a canonical `Team`.

```ts
const teams = new TeamRegistry();
teams.loadTeams(ALL_TEAMS);

teams.resolve('nba', 'Charlotte Hornets');   // ESPN name
teams.resolve('nba', 'CHA Hornets');         // DraftKings name
teams.resolve('nba', 'CHA');                 // abbreviation
teams.resolveByExternalId('espn', '30');     // by upstream ID
teams.fuzzyResolve('nba', 'GS Warriors');    // last-resort
```

Traditional sports load a complete registry; a miss means a normalization bug and callers should log drift, not auto-create. Esports (CS2, Val, LoL, Dota2, CoD, RL) allow auto-registration because rosters change too fast to hand-maintain.

## PlayerRegistry

Auto-discovering. Callers pass player names from ingested data; the registry de-dupes by normalized name and tracks external IDs per source.

```ts
const lebron = players.getOrCreate('nba', 'LeBron James', {
  source: 'espn', externalId: '1966', teamId: 'nba:team:lakers',
});
players.resolveByExternalId('draftkings', 'dk-12345');  // same player
```

Known weakness: single-name `resolve()` picks the first match if normalized names collide ("John Smith"). Prefer `resolveByExternalId()` when the source ID is available.

## Drift logging

When a resolver misses, the caller calls `logTeamDrift()` or `logPlayerDrift()`, which upserts into `team_drift` / `player_drift` keyed on `(source_id, sport, raw_name)`. Repeat misses increment `observation_count`. This is our data-quality backlog.

huddle-core builds the SQL; callers pass their own pg / Supabase client. No DB connection lives inside this package.

## Adding a new sport

1. Add team data in `src/ids/data/{sport}-teams.ts` via `defineTeam()`.
2. Export it from `src/ids/data/index.ts`.
3. Add the league config to `src/config/leagues.ts` (which providers it uses for schedule / live / odds).
4. Add tests for team resolution.
5. Bump, publish, update `@huddle-bet/core` pin in consumers.

## Key files

- `src/canonical.ts` — canonical event ID computation.
- `src/types/entities.ts` — `Team`, `Player`, `GameEvent`, `ExternalId`.
- `src/ids/team-registry.ts` — the main resolver.
- `src/ids/player-registry.ts` — auto-discovering player lookup.
- `src/config/leagues.ts` — per-league provider routing table.
- `src/drift.ts` — drift logging helpers.
- `docs/identity-layer.md` — extended usage examples.

## Known debt

- `fuzzyResolve` can false-match on short abbreviations (LA, NY, DC) colliding across leagues. Substring matching is gated at length ≥4 but the edge cases still exist.
- Unscoped external IDs (`espn:30` with no sport prefix) exist for back-compat and can collide across sports. Prefer sport-scoped lookups.
