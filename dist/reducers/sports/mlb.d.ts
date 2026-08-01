import type { LiveStateRow, ReducerResult, SportsLiveEvent } from '../types.js';
import { type BaseSportState } from './common.js';
export type MLBGameState = BaseSportState;
export declare function createMLBState(): MLBGameState;
export declare function reduceMLB(prev: LiveStateRow, evt: SportsLiveEvent): ReducerResult;
//# sourceMappingURL=mlb.d.ts.map