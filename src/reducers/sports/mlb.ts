import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
import {
  reduceSport,
  createBaseSportState,
  type BaseSportState,
} from './common.js';

export type MLBGameState = BaseSportState;

export function createMLBState(): MLBGameState {
  return createBaseSportState();
}

/**
 * ESPN's `status.period` gives the inning number (1-9+). Top/bottom
 * lives in a separate field not carried in the normalized SportsSnapshot
 * today — we surface the inning only. Extras show as "EXT 10", "EXT 11".
 * If top/bottom becomes a frontend need, extend SportsSnapshot with a
 * sport-specific extras field and route it through here.
 */
function formatPeriod(period: number): string {
  if (period === 0) return 'PREGAME';
  if (period <= 9) return `INN ${period}`;
  return `EXT ${period - 9}`;
}

export function reduceMLB(prev: LiveStateRow, evt: SportsLiveEvent): ReducerResult {
  return reduceSport(prev, evt, { formatPeriod, startText: 'First pitch' });
}
