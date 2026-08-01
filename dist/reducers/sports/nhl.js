import { reduceSport, createBaseSportState, } from './common.js';
export function createNHLState() {
    return createBaseSportState();
}
function formatPeriod(period) {
    if (period === 0)
        return 'PREGAME';
    if (period <= 3)
        return `P${period}`;
    if (period === 4)
        return 'OT';
    return 'SO';
}
export function reduceNHL(prev, evt) {
    return reduceSport(prev, evt, { formatPeriod, startText: 'Puck drop' });
}
//# sourceMappingURL=nhl.js.map