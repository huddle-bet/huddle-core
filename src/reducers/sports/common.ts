import type {
  LiveStateRow,
  LiveFeedRow,
  ReducerResult,
  SportsLiveEvent,
} from '../types.js';

/**
 * Shared live-state shape for traditional sports. Each sport's reducer
 * produces one of these under `state.gameState`. Frontend contract —
 * additions here must ship with a corresponding client update.
 *
 * `period` is the numeric period (quarter/half/inning/etc). `periodLabel`
 * is the display string formatted per-sport (Q3, P2, T5, OT1). Numeric
 * reads go through `period`; display reads go through `periodLabel`.
 */
export interface BaseSportState {
  period: number;
  clock: string;
  possession: 'home' | 'away' | null;
  periodLabel: string;
  coverage: 'full' | 'partial';
}

export function createBaseSportState(): BaseSportState {
  return {
    period: 0,
    clock: '',
    possession: null,
    periodLabel: '',
    coverage: 'partial',
  };
}

export type PeriodFormatter = (period: number) => string;

export interface SportReducerConfig {
  /** Maps numeric period (0 = pregame) to display label ('Q1', 'P2', 'T5', 'OT1'). */
  formatPeriod: PeriodFormatter;
  /** Feed text when status flips to 'live'. Sport-specific flavor ('Tip-off', 'Puck drop'). */
  startText?: string;
}

function makeFeedRow(
  evt: SportsLiveEvent,
  feedType: string,
  importance: LiveFeedRow['importance'],
  data: Record<string, unknown>,
): LiveFeedRow {
  return {
    event_id: evt.eventId,
    source_id: evt.sourceId,
    league_id: evt.leagueId,
    sort_index: evt.sortIndex,
    feed_type: feedType,
    importance,
    occurred_at: evt.occurredAt,
    data,
  };
}

/**
 * Generic sport reducer. Takes one SportsLiveEvent, folds it into the
 * previous LiveStateRow, returns new state + any emitted feed entries.
 * Per-sport differences live in the config (period label formatter +
 * start-of-game flavor text).
 *
 * Provider-agnostic — identical behavior whether the upstream was ESPN
 * snapshot-diff or a Sportradar push stream.
 */
export function reduceSport(
  prev: LiveStateRow,
  evt: SportsLiveEvent,
  config: SportReducerConfig,
): ReducerResult {
  const { formatPeriod, startText = 'Game started' } = config;
  const gameState: BaseSportState = {
    ...createBaseSportState(),
    ...(prev.state.gameState as BaseSportState | undefined),
  };

  let status = prev.status;
  let homeScore = prev.home_score;
  let awayScore = prev.away_score;
  let period = prev.period;
  let clock = prev.clock;
  let teams = prev.state.teams as Record<string, unknown> | undefined;
  let situation = prev.state.situation as Record<string, unknown> | undefined;
  const feed: LiveFeedRow[] = [];

  switch (evt.kind) {
    case 'status': {
      if (status !== evt.status) {
        status = evt.status;
        if (evt.status === 'live') {
          feed.push(makeFeedRow(evt, 'game_started', 'critical', { text: startText }));
        } else if (evt.status === 'final') {
          feed.push(makeFeedRow(evt, 'game_ended', 'critical', {
            text: 'Final',
            homeScore: evt.homeScore ?? homeScore,
            awayScore: evt.awayScore ?? awayScore,
          }));
        }
      }
      break;
    }

    case 'score': {
      const prevHome = homeScore ?? 0;
      const prevAway = awayScore ?? 0;
      homeScore = evt.homeScore;
      awayScore = evt.awayScore;
      if (evt.homeScore !== prevHome || evt.awayScore !== prevAway) {
        feed.push(makeFeedRow(evt, 'score_change', 'medium', {
          text: `${evt.awayScore} @ ${evt.homeScore}`,
          subtext: `${gameState.periodLabel || period || ''} ${gameState.clock || clock || ''}`.trim(),
          homeScore: evt.homeScore,
          awayScore: evt.awayScore,
          scorer: evt.scorer,
          delta: evt.delta,
        }));
      }
      break;
    }

    case 'clock': {
      const p = Number(evt.period) || gameState.period;
      gameState.period = p;
      gameState.clock = evt.clock;
      gameState.periodLabel = formatPeriod(p);
      period = gameState.periodLabel;
      clock = evt.clock;
      break;
    }

    case 'period': {
      const p = Number(evt.period) || gameState.period;
      gameState.period = p;
      gameState.periodLabel = formatPeriod(p);
      period = gameState.periodLabel;
      if (evt.phase === 'end') {
        feed.push(makeFeedRow(evt, 'period_ended', 'medium', {
          text: `End of ${gameState.periodLabel}`,
          homeScore,
          awayScore,
        }));
      }
      break;
    }

    case 'possession': {
      gameState.possession = evt.team;
      break;
    }

    case 'play': {
      feed.push(makeFeedRow(evt, 'play', evt.data.importance as LiveFeedRow['importance'] ?? 'low', evt.data));
      break;
    }

    case 'sync': {
      // Push-provider scoreboard/situation snapshot. Two teams populated is
      // what the live list uses to tell a real fixture from a phantom row.
      // Score rides along so the columns track every frame without a spurious
      // score_change feed row on the first post-connect frame.
      if (evt.teams) teams = evt.teams;
      if (evt.situation) {
        // Accumulate the current at-bat's pitches so the client can plot a
        // strike zone. Reset when the at-bat changes; cap the trail.
        const prevSit = (situation ?? {}) as Record<string, unknown>;
        const nextSit = { ...evt.situation } as Record<string, unknown>;
        const lastPitch = nextSit.lastPitch as { seq?: number } | null | undefined;
        let recent = (Array.isArray(prevSit.recentPitches) ? prevSit.recentPitches : []) as Array<{ seq?: number }>;
        if (nextSit.atBatId !== prevSit.atBatId) recent = [];
        if (lastPitch && (!recent.length || recent[recent.length - 1]?.seq !== lastPitch.seq)) {
          recent = [...recent, lastPitch].slice(-14);
        }
        nextSit.recentPitches = recent;
        situation = nextSit;
      }
      if (evt.homeScore != null) homeScore = evt.homeScore;
      if (evt.awayScore != null) awayScore = evt.awayScore;
      if (evt.periodLabel) {
        gameState.periodLabel = evt.periodLabel;
        period = evt.periodLabel;
      }
      break;
    }
  }

  const nextState: LiveStateRow = {
    event_id: prev.event_id,
    source_id: evt.sourceId,
    league_id: prev.league_id,
    status,
    period,
    clock,
    home_score: homeScore,
    away_score: awayScore,
    state: {
      ...prev.state,
      gameState,
      ...(teams ? { teams } : {}),
      ...(situation ? { situation } : {}),
    },
    sort_index: evt.sortIndex,
  };

  return { state: nextState, feed };
}

// ─── Snapshot diff (pull-based providers like ESPN) ─────────────────────

/**
 * Provider-agnostic snapshot shape. Pull-based providers (ESPN) build one
 * of these per poll; the diff against the previous snapshot becomes a
 * SportsLiveEvent[] stream fed to a sport reducer.
 */
export interface SportsSnapshot {
  status: 'scheduled' | 'live' | 'final';
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  possession: 'home' | 'away' | null;
}

export interface SnapshotContext {
  eventId: string;
  leagueId: string;
  sourceId: string;
  sortIndex: number;
  occurredAt: string;
}

/**
 * Synthesize a SportsLiveEvent[] from two consecutive snapshots. First
 * call (prev=undefined) emits the current status + score + clock as
 * baseline events. Subsequent calls emit only on change.
 */
export function snapshotDiff(
  ctx: SnapshotContext,
  prev: SportsSnapshot | undefined,
  curr: SportsSnapshot,
): SportsLiveEvent[] {
  const base = {
    eventId: ctx.eventId,
    leagueId: ctx.leagueId,
    sourceId: ctx.sourceId,
    sortIndex: ctx.sortIndex,
    occurredAt: ctx.occurredAt,
  };
  const events: SportsLiveEvent[] = [];

  if (!prev || prev.status !== curr.status) {
    events.push({
      ...base,
      kind: 'status',
      status: curr.status,
      homeScore: curr.homeScore,
      awayScore: curr.awayScore,
    });
  }

  if (prev && prev.period && prev.period !== curr.period) {
    events.push({ ...base, kind: 'period', period: prev.period, phase: 'end' });
  }

  if (curr.status === 'live') {
    events.push({ ...base, kind: 'clock', period: curr.period, clock: curr.clock });
  }

  const prevHome = prev?.homeScore ?? 0;
  const prevAway = prev?.awayScore ?? 0;
  if (!prev || prevHome !== curr.homeScore || prevAway !== curr.awayScore) {
    const homeDelta = curr.homeScore - prevHome;
    const awayDelta = curr.awayScore - prevAway;
    events.push({
      ...base,
      kind: 'score',
      homeScore: curr.homeScore,
      awayScore: curr.awayScore,
      scorer: homeDelta > 0 ? 'home' : awayDelta > 0 ? 'away' : undefined,
      delta: Math.max(homeDelta, awayDelta),
    });
  }

  const prevPossession = prev?.possession ?? null;
  if (curr.possession !== prevPossession) {
    events.push({ ...base, kind: 'possession', team: curr.possession });
  }

  return events;
}
