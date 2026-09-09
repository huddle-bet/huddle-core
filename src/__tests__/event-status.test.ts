import { describe, it, expect } from 'vitest';
import { EVENT_STATUSES, isEventStatus, type EventStatus } from '../types/events.js';

describe('EventStatus taxonomy', () => {
  it('carries every state a provider can report', () => {
    expect([...EVENT_STATUSES].sort()).toEqual([
      'cancelled',
      'delayed',
      'final',
      'live',
      'postponed',
      'scheduled',
      'suspended',
    ]);
  });

  it('spells cancelled with two Ls — the mobile union was renamed to match (ENG-517)', () => {
    expect(EVENT_STATUSES).toContain('cancelled');
    expect(EVENT_STATUSES).not.toContain('canceled');
  });

  it('accepts each member and rejects provider vocabulary that has not been mapped', () => {
    for (const status of EVENT_STATUSES) {
      expect(isEventStatus(status)).toBe(true);
    }
    // Sportradar's raw union — these must be mapped by the caller, not passed through.
    //
    // `delayed` left this list on 2026-09-09 when it became a member of the union, and that
    // is a real if small loss: `isEventStatus('delayed')` now returns true, so a writer that
    // passes Sportradar's own literal through is no longer caught by this guard. The values
    // Sportradar actually sends for a delay are `wdelay` and `odelay`, and both are asserted
    // below, so the guard still covers the mistake anyone is likely to make.
    for (const raw of ['inprogress', 'halftime', 'wdelay', 'odelay', 'complete', 'closed', 'unnecessary']) {
      expect(isEventStatus(raw)).toBe(false);
    }
  });

  it('narrows to EventStatus', () => {
    const raw: string = 'postponed';
    if (!isEventStatus(raw)) throw new Error('expected postponed to narrow');
    const narrowed: EventStatus = raw;
    expect(narrowed).toBe('postponed');
  });
});

/**
 * `delayed` fills a gap the other five could not express, and the distinction is the reason
 * it exists rather than being folded into one of them.
 *
 * Measured 2026-09-09: MLB Minnesota at Detroit read `status = 'live'` with no `live_state`
 * row and a start time still in the future, while Sportradar reported `wdelay`. The client's
 * only options were LIVE or a lie.
 */
describe('delayed is distinct from the states it is nearest to', () => {
  it('is a member, and narrows', () => {
    expect(isEventStatus('delayed')).toBe(true);
    const raw: string = 'delayed';
    if (!isEventStatus(raw)) throw new Error('expected delayed to narrow');
    const narrowed: EventStatus = raw;
    expect(narrowed).toBe('delayed');
  });

  it('is not suspended, which requires play to have started', () => {
    expect(EVENT_STATUSES).toContain('suspended');
    expect(EVENT_STATUSES).toContain('delayed');
    expect('delayed').not.toBe('suspended');
  });

  it('reaches the schedule filter without a second list being edited', () => {
    // huddle-api builds `?status=` as z.enum(EVENT_STATUSES) precisely so this holds. If the
    // union and the array ever drift, the compile-time exhaustiveness assert in events.ts
    // fails first — this asserts the runtime half a caller actually sees.
    expect(EVENT_STATUSES).toHaveLength(7);
    expect(new Set(EVENT_STATUSES).size).toBe(7);
  });
});
