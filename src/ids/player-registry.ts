import { randomUUID } from 'node:crypto';
import type { Player, TeamStint, DataSource } from '../types/entities.js';
import type { Sport } from '../types/sports.js';
import { normalizePlayerName } from './normalize.js';

/**
 * In-memory player registry that resolves any source-specific name or ID
 * to a canonical Player entity.
 *
 * Players can be registered from ingested data (auto-discovered) or
 * from pre-defined canonical lists.
 */
export class PlayerRegistry {
  private readonly players = new Map<string, Player>();
  /** "{sport}:{normalizedName}" → player ID */
  private readonly nameIndex = new Map<string, string>();
  /** "{source}:{externalId}" → player ID */
  private readonly externalIndex = new Map<string, string>();

  register(player: Player): void {
    this.players.set(player.id, player);

    this.nameIndex.set(this.key(player.sport, player.name), player.id);
    if (player.gamertag) {
      this.nameIndex.set(this.key(player.sport, player.gamertag), player.id);
    }

    for (const alias of player.aliases) {
      this.nameIndex.set(this.key(player.sport, alias), player.id);
    }

    for (const ext of player.externalIds) {
      this.externalIndex.set(`${ext.source}:${ext.id}`, player.id);
    }
  }

  loadPlayers(players: Player[]): void {
    for (const p of players) this.register(p);
  }

  resolve(sport: Sport, name: string): Player | undefined {
    const id = this.nameIndex.get(this.key(sport, name));
    return id ? this.players.get(id) : undefined;
  }

  resolveByExternalId(source: DataSource, externalId: string): Player | undefined {
    const id = this.externalIndex.get(`${source}:${externalId}`);
    return id ? this.players.get(id) : undefined;
  }

  get(id: string): Player | undefined {
    return this.players.get(id);
  }

  bySport(sport: Sport): Player[] {
    return [...this.players.values()].filter((p) => p.sport === sport);
  }

  /** Get all players currently on a given team */
  byTeam(teamId: string): Player[] {
    return [...this.players.values()].filter((p) => currentTeam(p) === teamId);
  }

  all(): Player[] {
    return [...this.players.values()];
  }

  /**
   * Auto-register a player discovered from ingested data.
   * Returns existing player if already known, otherwise creates new.
   *
   * @param date ISO date string of the game this data came from.
   *             Used to build team history timeline.
   */
  getOrCreate(sport: Sport, name: string, opts?: {
    gamertag?: string;
    teamId?: string;
    date?: string;
    position?: string;
    source?: DataSource;
    externalId?: string;
  }): Player {
    // Check if already known
    const existing = this.resolve(sport, name)
      ?? (opts?.gamertag ? this.resolve(sport, opts.gamertag) : undefined)
      ?? (opts?.source && opts?.externalId
        ? this.resolveByExternalId(opts.source, opts.externalId)
        : undefined);

    if (existing) {
      // Merge in any new external ID
      if (opts?.source && opts?.externalId) {
        const hasExt = existing.externalIds.some(
          (e) => e.source === opts.source && e.id === opts.externalId,
        );
        if (!hasExt) {
          existing.externalIds.push({ source: opts.source, id: opts.externalId });
          this.externalIndex.set(`${opts.source}:${opts.externalId}`, existing.id);
        }
      }
      // Update team history
      if (opts?.teamId) {
        updateTeamHistory(existing, opts.teamId, opts.date);
      }
      return existing;
    }

    // Create new with UUID
    const teamHistory: TeamStint[] = [];
    if (opts?.teamId) {
      teamHistory.push({ teamId: opts.teamId, from: opts.date ?? new Date().toISOString().slice(0, 10) });
    }

    const player: Player = {
      id: randomUUID(),
      name,
      gamertag: opts?.gamertag,
      sport,
      teamHistory,
      position: opts?.position,
      externalIds: opts?.source && opts?.externalId
        ? [{ source: opts.source, id: opts.externalId }]
        : [],
      aliases: [],
    };

    this.register(player);
    return player;
  }

  private key(sport: Sport, name: string): string {
    return `${sport}:${normalizePlayerName(name)}`;
  }
}

// ─── Team History Helpers ───────────────────────────────────────────────────

/**
 * Update a player's team history with a new observation.
 * If the latest stint is the same team, do nothing.
 * If different, close the old stint and start a new one.
 */
function updateTeamHistory(player: Player, teamId: string, date?: string): void {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const history = player.teamHistory;

  if (history.length === 0) {
    history.push({ teamId, from: d });
    return;
  }

  const latest = history[history.length - 1];

  // Same team — no change needed
  if (latest.teamId === teamId) return;

  // Different team — only create a new stint if this date is >= the latest
  // (handles out-of-order ingestion gracefully by not backdating)
  if (d >= latest.from) {
    latest.until = d;
    history.push({ teamId, from: d });
  }
}

/** Get a player's current team ID (latest open stint) */
export function currentTeam(player: Player): string | undefined {
  const history = player.teamHistory;
  if (history.length === 0) return undefined;
  const latest = history[history.length - 1];
  return latest.until ? undefined : latest.teamId;
}

/** Get a player's team on a specific date */
export function teamOnDate(player: Player, date: string): string | undefined {
  // Search backwards (most recent first) for efficiency
  for (let i = player.teamHistory.length - 1; i >= 0; i--) {
    const stint = player.teamHistory[i];
    if (date >= stint.from && (!stint.until || date < stint.until)) {
      return stint.teamId;
    }
  }
  return undefined;
}
