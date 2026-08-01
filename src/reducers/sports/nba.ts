import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
import {
  reduceSport,
  createBaseSportState,
  type BaseSportState,
} from './common.js';

export type NBAGameState = BaseSportState;

export function createNBAState(): NBAGameState {
  return createBaseSportState();
}

function formatPeriod(period: number): string {
  if (period === 0) return 'PREGAME';
  if (period <= 4) return `Q${period}`;
  return `OT${period - 4}`;
}

export function reduceNBA(prev: LiveStateRow, evt: SportsLiveEvent): ReducerResult {
  return reduceSport(prev, evt, { formatPeriod, startText: 'Tip-off' });
}
