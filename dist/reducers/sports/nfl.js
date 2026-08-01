import { reduceSport, createBaseSportState, } from './common.js';
export function createNFLState() {
    return createBaseSportState();
}
function formatPeriod(period) {
    if (period === 0)
        return 'PREGAME';
    if (period <= 4)
        return `Q${period}`;
    return period === 5 ? 'OT' : `OT${period - 4}`;
}
export function reduceNFL(prev, evt) {
    return reduceSport(prev, evt, { formatPeriod, startText: 'Kickoff' });
}
//# sourceMappingURL=nfl.js.map