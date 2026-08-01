import { describe, it, expect } from 'vitest';
import { reduceNBA, createNBAState, type NBAGameState } from './nba.js';
import type { LiveStateRow, SportsLiveEvent } from '../types.js';

function initialState(eventId = 'nba-1', league = 'nba'): LiveStateRow {
  return {
    event_id: eventId,
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

function fold(events: SportsLiveEvent[], start: LiveStateRow = initialState()) {
  let state = start;
  const feed: any[] = [];
  for (const evt of events) {
    const result = reduceNBA(state, evt);
    state = result.state;
    feed.push(...result.feed);
  }
  return { state, feed };
}

function evt(base: Partial<SportsLiveEvent> & { kind: SportsLiveEvent['kind'] }, overrides: any = {}): SportsLiveEvent {
  return {
    eventId: 'nba-1',
    leagueId: 'nba',
    sourceId: 'espn',
    sortIndex: Date.now(),
    occurredAt: new Date().toISOString(),
    ...base,
    ...overrides,
  } as SportsLiveEvent;
}

describe('reduceNBA', () => {
  it('status transition scheduled → live emits game_started feed', () => {
    const { state, feed } = fold([evt({ kind: 'status' }, { status: 'live' })]);
    expect(state.status).toBe('live');
    expect(feed).toHaveLength(1);
    expect(feed[0].feed_type).toBe('game_started');
    expect(feed[0].importance).toBe('critical');
  });

  it('status transition live → final emits game_ended feed with scores', () => {
    const live = fold([evt({ kind: 'status' }, { status: 'live' })]);
    const scored = fold(
      [evt({ kind: 'score' }, { homeScore: 112, awayScore: 108 })],
      live.state,
    );
    const { state, feed } = fold(
      [evt({ kind: 'status' }, { status: 'final' })],
      scored.state,
    );
    expect(state.status).toBe('final');
    const ended = feed.find((f) => f.feed_type === 'game_ended');
    expect(ended).toBeTruthy();
    expect(ended.data.homeScore).toBe(112);
    expect(ended.data.awayScore).toBe(108);
  });

  it('game_ended carries final scores when status + score arrive in the same batch', () => {
    // snapshotDiff emits the status event before the score event, so the
    // game_ended row must read scores off the status event, not folded state.
    const { feed } = fold([
      evt({ kind: 'status' }, { status: 'final', homeScore: 136, awayScore: 101 }),
      evt({ kind: 'score' }, { homeScore: 136, awayScore: 101 }),
    ]);
    const ended = feed.find((f) => f.feed_type === 'game_ended');
    expect(ended).toBeTruthy();
    expect(ended.data.homeScore).toBe(136);
    expect(ended.data.awayScore).toBe(101);
  });

  it('repeated identical status does not emit another feed', () => {
    const first = fold([evt({ kind: 'status' }, { status: 'live' })]);
    const { feed } = fold([evt({ kind: 'status' }, { status: 'live' })], first.state);
    expect(feed).toHaveLength(0);
  });

  it('score event updates home/away and emits score_change feed on delta', () => {
    const { state, feed } = fold([
      evt({ kind: 'score' }, { homeScore: 42, awayScore: 39, scorer: 'home', delta: 2 }),
    ]);
    expect(state.home_score).toBe(42);
    expect(state.away_score).toBe(39);
    const scoreFeed = feed.find((f) => f.feed_type === 'score_change');
    expect(scoreFeed).toBeTruthy();
    expect(scoreFeed.data.scorer).toBe('home');
    expect(scoreFeed.data.delta).toBe(2);
  });

  it('score event with no change does not emit feed', () => {
    const first = fold([evt({ kind: 'score' }, { homeScore: 50, awayScore: 48 })]);
    const { feed } = fold(
      [evt({ kind: 'score' }, { homeScore: 50, awayScore: 48 })],
      first.state,
    );
    expect(feed).toHaveLength(0);
  });

  it('clock event sets period label and clock string', () => {
    const { state } = fold([evt({ kind: 'clock' }, { period: '2', clock: '8:15' })]);
    const game = state.state.gameState as NBAGameState;
    expect(game.period).toBe(2);
    expect(game.clock).toBe('8:15');
    expect(game.periodLabel).toBe('Q2');
    expect(state.period).toBe('Q2');
    expect(state.clock).toBe('8:15');
  });

  it('quarter 5+ maps to OT label', () => {
    const { state } = fold([evt({ kind: 'clock' }, { period: '5', clock: '4:32' })]);
    expect(state.period).toBe('OT1');
  });

  it('period end emits period_ended feed carrying current scores', () => {
    const scored = fold([evt({ kind: 'score' }, { homeScore: 28, awayScore: 25 })]);
    const { feed } = fold(
      [evt({ kind: 'period' }, { period: '1', phase: 'end' })],
      scored.state,
    );
    const periodFeed = feed.find((f) => f.feed_type === 'period_ended');
    expect(periodFeed).toBeTruthy();
    expect(periodFeed.data.homeScore).toBe(28);
    expect(periodFeed.data.awayScore).toBe(25);
  });

  it('possession event updates state without emitting feed', () => {
    const { state, feed } = fold([evt({ kind: 'possession' }, { team: 'away' })]);
    const game = state.state.gameState as NBAGameState;
    expect(game.possession).toBe('away');
    expect(feed).toHaveLength(0);
  });

  it('play event appends a low-importance feed entry', () => {
    const { feed } = fold([
      evt({ kind: 'play' }, { data: { text: 'LeBron 3PT make', actors: ['LeBron'] } }),
    ]);
    expect(feed).toHaveLength(1);
    expect(feed[0].feed_type).toBe('play');
    expect(feed[0].importance).toBe('low');
    expect(feed[0].data.text).toBe('LeBron 3PT make');
  });

  it('full game lifecycle produces coherent state and ordered feed', () => {
    const events: SportsLiveEvent[] = [
      evt({ kind: 'status' }, { status: 'live' }),
      evt({ kind: 'clock' }, { period: '1', clock: '12:00' }),
      evt({ kind: 'score' }, { homeScore: 0, awayScore: 3, scorer: 'away', delta: 3 }),
      evt({ kind: 'score' }, { homeScore: 2, awayScore: 3, scorer: 'home', delta: 2 }),
      evt({ kind: 'period' }, { period: '1', phase: 'end' }),
      evt({ kind: 'clock' }, { period: '2', clock: '12:00' }),
      evt({ kind: 'score' }, { homeScore: 55, awayScore: 52 }),
      evt({ kind: 'status' }, { status: 'final' }),
    ];
    const { state, feed } = fold(events);

    expect(state.status).toBe('final');
    expect(state.home_score).toBe(55);
    expect(state.away_score).toBe(52);
    const types = feed.map((f) => f.feed_type);
    expect(types).toContain('game_started');
    expect(types).toContain('score_change');
    expect(types).toContain('period_ended');
    expect(types).toContain('game_ended');
  });

  it('createNBAState returns zeroed defaults', () => {
    const s = createNBAState();
    expect(s.period).toBe(0);
    expect(s.clock).toBe('');
    expect(s.possession).toBeNull();
    expect(s.periodLabel).toBe('');
  });
});
