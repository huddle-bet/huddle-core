import type { LiveStateRow, ReducerResult, EsportsLiveEvent } from '../types.js';
import { reduceCS2, createCS2State } from './cs2.js';
import type { CS2GameState } from './cs2.js';

export { createCS2State as createValState };
export type { CS2GameState as ValGameState };

/**
 * Valorant uses the same normalized event structure as CS2.
 * Spike maps to bomb, Attacker/Defender map to T/CT.
 * We delegate entirely to reduceCS2.
 */
export function reduceVal(
  prev: LiveStateRow,
  msg: EsportsLiveEvent,
): ReducerResult {
  return reduceCS2(prev, msg);
}
