import { reduceCS2, createCS2State } from './cs2.js';
export { createCS2State as createValState };
/**
 * Valorant uses the same normalized event structure as CS2.
 * Spike maps to bomb, Attacker/Defender map to T/CT.
 * We delegate entirely to reduceCS2.
 */
export function reduceVal(prev, msg) {
    return reduceCS2(prev, msg);
}
//# sourceMappingURL=valorant.js.map