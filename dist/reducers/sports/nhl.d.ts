import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
import { type BaseSportState } from './common.js';
export type NHLGameState = BaseSportState;
export declare function createNHLState(): NHLGameState;
export declare function reduceNHL(prev: LiveStateRow, evt: SportsLiveEvent): ReducerResult;
//# sourceMappingURL=nhl.d.ts.map