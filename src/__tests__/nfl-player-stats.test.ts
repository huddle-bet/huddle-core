import { describe, it, expect } from 'vitest';
import { nflGamePlayerStats, nflTeamPlayerStats } from '../sportradar/nfl-player-stats.js';
import {
  NFL_EXPECTED_PLAYERS,
  NFL_TEAM_STATISTICS,
} from '../sportradar/__fixtures__/nfl-team-statistics.js';

/**
 * `NFL_EXPECTED_PLAYERS` is the output of huddle-data's shipped `normalizeNflGame` run on
 * `NFL_TEAM_STATISTICS` — the same payload, the same day. It is not hand-written and does
 * not come from this implementation.
 *
 * That provenance is the point. These functions exist so huddle-live writes the rows
 * huddle-data already writes; expectations derived from the new code would prove nothing
 * about that. Two writers with two shapes is the defect (ENG-460), and NFL is the sport
 * where it would land during a launch season.
 */
describe('nflTeamPlayerStats matches huddle-data', () => {
  const actual = nflTeamPlayerStats(NFL_TEAM_STATISTICS);
  const byName = new Map(actual.map((p) => [p.name, p]));

  it('has fixtures to check', () => {
    expect(NFL_EXPECTED_PLAYERS.length).toBeGreaterThan(0);
    expect(actual.length).toBeGreaterThan(0);
  });

  it.each(NFL_EXPECTED_PLAYERS.map((p) => [p.name, p] as const))('%s', (name, expected) => {
    const got = byName.get(name);
    expect(got, `${name} missing from flattener output`).toBeDefined();
    expect(got!.stats).toEqual(expected.stats);
    expect(got!.athleteId).toBe(expected.athleteId);
    expect(got!.position).toBe(expected.position);
  });
});

describe('the vocabulary is the one projections.ts reads', () => {
  // Exactly the lookups in huddle-engine's PROP_STATS_BY_LEAGUE.nfl. A self-consistent
  // port that renamed a key would still fail here.
  it('exposes category-prefixed keys', () => {
    const all = nflTeamPlayerStats(NFL_TEAM_STATISTICS).flatMap((p) => Object.keys(p.stats));
    for (const key of [
      'passing_yards',
      'passing_touchdowns',
      'rushing_yards',
      'receiving_receptions',
      'receiving_yards',
    ]) {
      expect(all, `missing ${key}`).toContain(key);
    }
  });

  it('does not emit the ambiguous compact keys', () => {
    // `YDS` mapped to passing, rushing and receiving at once against a flat lookup,
    // which is what produced no NFL projections for months (ENG-395).
    const all = nflTeamPlayerStats(NFL_TEAM_STATISTICS).flatMap((p) => Object.keys(p.stats));
    for (const key of ['YDS', 'TD', 'REC', 'CMP']) expect(all).not.toContain(key);
  });
});

describe('coalescing across categories', () => {
  it('merges a player appearing in two categories into one row', () => {
    // A quarterback who runs shows up under both `passing` and `rushing`.
    const team = {
      id: 't1',
      market: 'Test',
      name: 'Team',
      passing: { players: [{ id: 'p1', name: 'QB One', position: 'QB', yards: 300, touchdowns: 3 }] },
      rushing: { players: [{ id: 'p1', name: 'QB One', position: 'QB', yards: 25, attempts: 4 }] },
    };
    const [player] = nflTeamPlayerStats(team);
    expect(player!.stats).toEqual({
      passing_yards: 300,
      passing_touchdowns: 3,
      rushing_yards: 25,
      rushing_attempts: 4,
    });
  });

  it('keeps same-named stats distinct per category rather than clobbering', () => {
    const team = {
      passing: { players: [{ id: 'p1', name: 'X', yards: 300 }] },
      rushing: { players: [{ id: 'p1', name: 'X', yards: 25 }] },
    };
    const [player] = nflTeamPlayerStats(team);
    expect(player!.stats.passing_yards).toBe(300);
    expect(player!.stats.rushing_yards).toBe(25);
  });
});

describe('what is skipped', () => {
  it('ignores the team summary block, which is totals rather than players', () => {
    const team = {
      summary: { players: [{ id: 'x', name: 'Not A Player', points: 21 }] },
      passing: { players: [{ id: 'p1', name: 'Real', yards: 1 }] },
    };
    expect(nflTeamPlayerStats(team).map((p) => p.name)).toEqual(['Real']);
  });

  it('drops identity fields and nested objects from stats', () => {
    const team = {
      passing: {
        players: [{ id: 'p1', name: 'X', jersey: '12', position: 'QB', played: true, yards: 10, splits: { a: 1 } }],
      },
    };
    const [player] = nflTeamPlayerStats(team);
    expect(player!.stats).toEqual({ passing_yards: 10 });
  });

  it('skips a player with no usable key', () => {
    const team = { passing: { players: [{ yards: 5 }, { id: 'p2', name: 'Keeper', yards: 7 }] } };
    expect(nflTeamPlayerStats(team).map((p) => p.name)).toEqual(['Keeper']);
  });

  it('returns empty for a missing or non-object team', () => {
    expect(nflTeamPlayerStats(null)).toEqual([]);
    expect(nflTeamPlayerStats(undefined)).toEqual([]);
    expect(nflTeamPlayerStats('nope')).toEqual([]);
  });
});

describe('nflGamePlayerStats', () => {
  it('unwraps the statistics envelope and returns both teams', () => {
    const payload = {
      statistics: {
        home: { passing: { players: [{ id: 'h1', name: 'Home QB', yards: 200 }] } },
        away: { rushing: { players: [{ id: 'a1', name: 'Away RB', yards: 90 }] } },
      },
    };
    const { home, away } = nflGamePlayerStats(payload);
    expect(home.map((p) => p.name)).toEqual(['Home QB']);
    expect(away.map((p) => p.name)).toEqual(['Away RB']);
  });

  it('accepts an already-unwrapped payload', () => {
    const payload = { home: { passing: { players: [{ id: 'h1', name: 'Home QB', yards: 200 }] } }, away: {} };
    expect(nflGamePlayerStats(payload).home).toHaveLength(1);
  });
});
