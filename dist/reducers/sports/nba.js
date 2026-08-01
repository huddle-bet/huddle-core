import { reduceSport, createBaseSportState, } from './common.js';
export function createNBAState() {
    return createBaseSportState();
}
function formatPeriod(period) {
    if (period === 0)
        return 'PREGAME';
    if (period <= 4)
        return `Q${period}`;
    return `OT${period - 4}`;
}
export function reduceNBA(prev, evt) {
    return reduceSport(prev, evt, { formatPeriod, startText: 'Tip-off' });
}
//# sourceMappingURL=nba.js.map