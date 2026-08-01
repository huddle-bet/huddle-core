import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
import { type BaseSportState } from './common.js';
export type NBAGameState = BaseSportState;
export declare function createNBAState(): NBAGameState;
export declare function reduceNBA(prev: LiveStateRow, evt: SportsLiveEvent): ReducerResult;
//# sourceMappingURL=nba.d.ts.map