import { describe, it, expect } from 'vitest';
import { adaptFeedRow } from '../types/live.js';

const row = (data: Record<string, unknown>) => ({
  id: 1,
  event_id: 'e1',
  source_id: 'sportradar',
  league_id: 'nfl',
  sort_index: 42,
  feed_type: 'play',
  importance: 'low',
  occurred_at: '2026-09-10T02:32:12.000Z',
  data,
}) as never;

describe('adaptFeedRow text', () => {
  it('reads description when the play translator wrote no text', () => {
    expect(adaptFeedRow(row({ description: 'R.Stevenson rushed right guard for 1 yard. Tackled by D.Thomas' })).text)
      .toBe('R.Stevenson rushed right guard for 1 yard. Tackled by D.Thomas');
  });

  it('prefers text when both spellings are present', () => {
    expect(adaptFeedRow(row({ text: 'Kickoff', description: 'ignored' })).text).toBe('Kickoff');
  });

  it('is empty when the row carries neither', () => {
    expect(adaptFeedRow(row({ period: '1' })).text).toBe('');
  });
});
