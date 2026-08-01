import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
import { type BaseSportState } from './common.js';
export type NFLGameState = BaseSportState;
export declare function createNFLState(): NFLGameState;
export declare function reduceNFL(prev: LiveStateRow, evt: SportsLiveEvent): ReducerResult;
//# sourceMappingURL=nfl.d.ts.map