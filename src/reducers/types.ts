/**
 * Reducer-specific types — extends the shared row shapes from
 * `../types/live.ts` with the event vocabularies and result types that
 * only the live-state reducers care about.
 *
 * `LiveStateRow`, `LiveFeedRow`, `FeedEntry`, and `adaptFeedRow` are
 * the canonical types defined in core/types/live.ts and re-exported here
 * so reducer files can keep their existing `import { LiveStateRow, ... }
 * from '../types.js'` form unchanged.
 */
export type { LiveStateRow, LiveFeedRow, FeedEntry, FeedImportance, LiveStateBlob } from '../types/live.js';
export { adaptFeedRow, FEED_TYPES, isFeedType } from '../types/live.js';

import type { LiveStateRow, LiveFeedRow } from '../types/live.js';

export interface ReducerResult {
  state: LiveStateRow;
  feed: LiveFeedRow[];
}

/**
 * Live event shape consumed by esports reducers. The native esports
 * provider taxonomies (HLTV scorebot, vlr.gg, lolesports, Valve Dota2)
 * are translated into this canonical shape upstream — reducers consume
 * it directly with no provider knowledge.
 *
 * Traditional sports use `SportsLiveEvent` instead, which is a fully
 * normalized discriminated union decoupled from any specific provider.
 */
export interface EsportsLiveEvent {
  type: string;
  payload?: any;
  sortIndex: number;
}

/**
 * Normalized live event vocabulary for traditional sports. Providers
 * (ESPN today, Sportradar next, Genius after) translate their native
 * payloads into these events; sport reducers (nba, nfl, nhl, mlb, ncaam,
 * ncaaf) consume them with zero provider knowledge.
 *
 * Every variant carries the owning event's ID, a monotonic sortIndex
 * (Date.now() for poll-based providers), and the upstream source so the
 * coordinator can tag the resulting live_state row.
 */
interface SportsEventBase {
  eventId: string;
  leagueId: string;
  sourceId: string;
  sortIndex: number;
  occurredAt: string;
}

export type SportsLiveEvent =
  | (SportsEventBase & {
      kind: 'status';
      status: 'scheduled' | 'live' | 'final';
    })
  | (SportsEventBase & {
      kind: 'score';
      homeScore: number;
      awayScore: number;
      scorer?: 'home' | 'away';
      delta?: number;
    })
  | (SportsEventBase & {
      kind: 'clock';
      period: string;
      clock: string;
    })
  | (SportsEventBase & {
      kind: 'period';
      period: string;
      phase: 'start' | 'end';
    })
  | (SportsEventBase & {
      kind: 'possession';
      team: 'home' | 'away' | null;
    })
  | (SportsEventBase & {
      kind: 'play';
      data: Record<string, unknown>;
    });
