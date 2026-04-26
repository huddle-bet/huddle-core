import type { LiveStateRow, ReducerResult, EsportsLiveEvent } from '../types.js';
import { createCS2State } from './cs2.js';
import type { CS2GameState } from './cs2.js';
export { createCS2State as createValState };
export type { CS2GameState as ValGameState };
/**
 * Valorant uses the same GSK event structure as CS2.
 * Spike maps to bomb, Attacker/Defender map to T/CT.
 * We delegate entirely to reduceCS2.
 */
export declare function reduceVal(prev: LiveStateRow, msg: EsportsLiveEvent): ReducerResult;
//# sourceMappingURL=valorant.d.ts.map