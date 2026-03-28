import { randomUUID } from 'node:crypto';
import { normalizePlayerName } from './normalize.js';
/**
 * In-memory player registry that resolves any source-specific name or ID
 * to a canonical Player entity.
 *
 * Players can be registered from ingested data (auto-discovered) or
 * from pre-defined canonical lists.
 */
export class PlayerRegistry {
    players = new Map();
    /** "{sport}:{normalizedName}" → player IDs (multiple for duplicate names) */
    nameIndex = new Map();
    /** "{source}:{externalId}" → player ID */
    externalIndex = new Map();
    register(player) {
        this.players.set(player.id, player);
        this.addToNameIndex(player.sport, player.name, player.id);
        if (player.gamertag) {
            this.addToNameIndex(player.sport, player.gamertag, player.id);
        }
        for (const alias of player.aliases) {
            this.addToNameIndex(player.sport, alias, player.id);
        }
        for (const ext of player.externalIds) {
            this.externalIndex.set(`${ext.source}:${ext.id}`, player.id);
        }
    }
    addToNameIndex(sport, name, playerId) {
        const k = this.key(sport, name);
        const existing = this.nameIndex.get(k) ?? [];
        if (!existing.includes(playerId)) {
            existing.push(playerId);
            this.nameIndex.set(k, existing);
        }
    }
    loadPlayers(players) {
        for (const p of players)
            this.register(p);
    }
    /**
     * Resolve by name. If multiple players share the name, returns the first one.
     * For disambiguation, use resolveByExternalId or resolveByNameAndTeam.
     */
    resolve(sport, name) {
        const ids = this.nameIndex.get(this.key(sport, name));
        if (!ids || ids.length === 0)
            return undefined;
        return this.players.get(ids[0]);
    }
    /** Returns all players matching this name (for duplicate detection) */
    resolveAll(sport, name) {
        const ids = this.nameIndex.get(this.key(sport, name));
        if (!ids)
            return [];
        return ids.map((id) => this.players.get(id)).filter(Boolean);
    }
    resolveByExternalId(source, externalId) {
        const id = this.externalIndex.get(`${source}:${externalId}`);
        return id ? this.players.get(id) : undefined;
    }
    get(id) {
        return this.players.get(id);
    }
    bySport(sport) {
        return [...this.players.values()].filter((p) => p.sport === sport);
    }
    /** Get all players currently on a given team */
    byTeam(teamId) {
        return [...this.players.values()].filter((p) => currentTeam(p) === teamId);
    }
    all() {
        return [...this.players.values()];
    }
    /**
     * Auto-register a player discovered from ingested data.
     * Returns existing player if already known, otherwise creates new.
     *
     * @param date ISO date string of the game this data came from.
     *             Used to build team history timeline.
     */
    getOrCreate(sport, name, opts) {
        // Resolution priority:
        // 1. External ID (most reliable — survives trades, name changes)
        // 2. Name + team context (disambiguates same-name players)
        // 3. Gamertag (esports)
        // 4. Plain name (fallback)
        const existing = (opts?.source && opts?.externalId
            ? this.resolveByExternalId(opts.source, opts.externalId)
            : undefined)
            ?? (opts?.teamId
                ? this.resolveByNameAndTeam(sport, name, opts.teamId)
                : undefined)
            ?? (opts?.gamertag ? this.resolve(sport, opts.gamertag) : undefined)
            ?? this.resolve(sport, name);
        if (existing) {
            if (opts?.source && opts?.externalId) {
                // Check if this exact external ID is already on the player
                const hasExact = existing.externalIds.some((e) => e.source === opts.source && e.id === opts.externalId);
                if (!hasExact) {
                    // New external ID. If the player already has a DIFFERENT ID from this
                    // same source, it's a different person with the same name.
                    // (Sources that give multiple IDs per player, like FD, should use
                    //  qualified source names like "fanduel_over" / "fanduel_under"
                    //  so each source has exactly one ID per player.)
                    const hasDifferentIdFromSource = existing.externalIds.some((e) => e.source === opts.source);
                    if (hasDifferentIdFromSource) {
                        // Different ID from same source → different person, fall through to create
                    }
                    else {
                        // New source — safe to merge
                        existing.externalIds.push({ source: opts.source, id: opts.externalId });
                        this.externalIndex.set(`${opts.source}:${opts.externalId}`, existing.id);
                        if (opts?.teamId)
                            updateTeamHistory(existing, opts.teamId, opts.date);
                        return existing;
                    }
                }
                else {
                    // Exact match — same ID already registered
                    if (opts?.teamId)
                        updateTeamHistory(existing, opts.teamId, opts.date);
                    return existing;
                }
            }
            else {
                // No external ID provided — trust the name/team/gamertag match
                if (opts?.teamId)
                    updateTeamHistory(existing, opts.teamId, opts.date);
                return existing;
            }
        }
        // Create new with UUID
        const teamHistory = [];
        if (opts?.teamId) {
            teamHistory.push({ teamId: opts.teamId, from: opts.date ?? new Date().toISOString().slice(0, 10) });
        }
        const player = {
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
    /**
     * Resolve a player by name AND team context.
     * Handles duplicate names: if multiple players share a name,
     * returns the one currently on the given team.
     */
    resolveByNameAndTeam(sport, name, teamId) {
        const candidates = this.resolveAll(sport, name);
        if (candidates.length === 0)
            return undefined;
        // Only one player with this name — no ambiguity
        if (candidates.length === 1)
            return candidates[0];
        // Multiple players with same name — find the one on the target team
        const onTeam = candidates.find((p) => currentTeam(p) === teamId);
        if (onTeam)
            return onTeam;
        // No candidate on the target team — could be a trade in progress.
        // Return the first one; team history will update when the trade is confirmed.
        return candidates[0];
    }
    key(sport, name) {
        return `${sport}:${normalizePlayerName(name)}`;
    }
}
// ─── Team History Helpers ───────────────────────────────────────────────────
/**
 * Update a player's team history with a new observation.
 * If the latest stint is the same team, do nothing.
 * If different, close the old stint and start a new one.
 */
function updateTeamHistory(player, teamId, date) {
    const d = date ?? new Date().toISOString().slice(0, 10);
    const history = player.teamHistory;
    if (history.length === 0) {
        history.push({ teamId, from: d });
        return;
    }
    const latest = history[history.length - 1];
    // Same team — no change needed
    if (latest.teamId === teamId)
        return;
    // Different team — only create a new stint if this date is >= the latest
    // (handles out-of-order ingestion gracefully by not backdating)
    if (d >= latest.from) {
        latest.until = d;
        history.push({ teamId, from: d });
    }
}
/** Get a player's current team ID (latest open stint) */
export function currentTeam(player) {
    const history = player.teamHistory;
    if (history.length === 0)
        return undefined;
    const latest = history[history.length - 1];
    return latest.until ? undefined : latest.teamId;
}
/** Get a player's team on a specific date */
export function teamOnDate(player, date) {
    // Search backwards (most recent first) for efficiency
    for (let i = player.teamHistory.length - 1; i >= 0; i--) {
        const stint = player.teamHistory[i];
        if (date >= stint.from && (!stint.until || date < stint.until)) {
            return stint.teamId;
        }
    }
    return undefined;
}
//# sourceMappingURL=player-registry.js.map