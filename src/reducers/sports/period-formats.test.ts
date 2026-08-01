import { describe, it, expect } from 'vitest';
import type { LiveStateRow, SportsLiveEvent } from '../types.js';
import { reduceNFL } from './nfl.js';
import { reduceNHL } from './nhl.js';
import { reduceMLB } from './mlb.js';

function initial(league: string): LiveStateRow {
  return {
    event_id: 'x',
    source_id: 'espn',
    league_id: league,
    status: 'scheduled',
    period: null,
    clock: null,
    home_score: null,
    away_score: null,
    state: {},
    sort_index: 0,
  };
}

function clockEvt(league: string, period: string): SportsLiveEvent {
  return {
    kind: 'clock',
    eventId: 'x',
    leagueId: league,
    sourceId: 'espn',
    sortIndex: 1,
    occurredAt: '2026-04-13T00:00:00.000Z',
    period,
    clock: '0:00',
  };
}

describe('period formatters', () => {
  it('NFL maps 1-4 → Q1-Q4, 5 → OT, 6+ → OT2+', () => {
    expect(reduceNFL(initial('nfl'), clockEvt('nfl', '3')).state.period).toBe('Q3');
    expect(reduceNFL(initial('nfl'), clockEvt('nfl', '5')).state.period).toBe('OT');
    expect(reduceNFL(initial('nfl'), clockEvt('nfl', '6')).state.period).toBe('OT2');
  });

  it('NHL maps 1-3 → P1-P3, 4 → OT, 5 → SO', () => {
    expect(reduceNHL(initial('nhl'), clockEvt('nhl', '1')).state.period).toBe('P1');
    expect(reduceNHL(initial('nhl'), clockEvt('nhl', '3')).state.period).toBe('P3');
    expect(reduceNHL(initial('nhl'), clockEvt('nhl', '4')).state.period).toBe('OT');
    expect(reduceNHL(initial('nhl'), clockEvt('nhl', '5')).state.period).toBe('SO');
  });

  it('MLB maps 1-9 → INN N, 10+ → EXT N', () => {
    expect(reduceMLB(initial('mlb'), clockEvt('mlb', '1')).state.period).toBe('INN 1');
    expect(reduceMLB(initial('mlb'), clockEvt('mlb', '9')).state.period).toBe('INN 9');
    expect(reduceMLB(initial('mlb'), clockEvt('mlb', '11')).state.period).toBe('EXT 2');
  });
});
