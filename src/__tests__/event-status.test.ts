import { describe, it, expect } from 'vitest';
import { EVENT_STATUSES, isEventStatus, type EventStatus } from '../types/events.js';

describe('EventStatus taxonomy', () => {
  it('carries every state a provider can report', () => {
    expect([...EVENT_STATUSES].sort()).toEqual([
      'cancelled',
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
    for (const raw of ['inprogress', 'halftime', 'delayed', 'complete', 'closed', 'unnecessary']) {
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
