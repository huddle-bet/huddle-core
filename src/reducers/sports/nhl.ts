import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
import {
  reduceSport,
  createBaseSportState,
  type BaseSportState,
} from './common.js';

export type NHLGameState = BaseSportState;

export function createNHLState(): NHLGameState {
  return createBaseSportState();
}

function formatPeriod(period: number): string {
  if (period === 0) return 'PREGAME';
  if (period <= 3) return `P${period}`;
  if (period === 4) return 'OT';
  return 'SO';
}

export function reduceNHL(prev: LiveStateRow, evt: SportsLiveEvent): ReducerResult {
  return reduceSport(prev, evt, { formatPeriod, startText: 'Puck drop' });
}
