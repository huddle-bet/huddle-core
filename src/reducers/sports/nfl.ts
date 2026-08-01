import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
import {
  reduceSport,
  createBaseSportState,
  type BaseSportState,
} from './common.js';

export type NFLGameState = BaseSportState;

export function createNFLState(): NFLGameState {
  return createBaseSportState();
}

function formatPeriod(period: number): string {
  if (period === 0) return 'PREGAME';
  if (period <= 4) return `Q${period}`;
  return period === 5 ? 'OT' : `OT${period - 4}`;
}

export function reduceNFL(prev: LiveStateRow, evt: SportsLiveEvent): ReducerResult {
  return reduceSport(prev, evt, { formatPeriod, startText: 'Kickoff' });
}
