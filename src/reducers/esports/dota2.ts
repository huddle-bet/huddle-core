import type { LiveStateRow, LiveFeedRow, ReducerResult, EsportsLiveEvent } from '../types.js';

// --- Dota2 Game State Shape ---

interface Dota2StructureCount { destroyed: number; remaining: number; }
interface Dota2Structures {
  towers: Dota2StructureCount;
  barracks: Dota2StructureCount;
  shrines: Dota2StructureCount;
  ancientDestroyed: boolean;
}

interface Dota2Team {
  id: string;
  name: string;
  side: string;
  totalKills: number;
  totalGold: number;
  structures: Dota2Structures;
}

const EMPTY_STRUCTURES: Dota2Structures = {
  towers: { destroyed: 0, remaining: 0 },
  barracks: { destroyed: 0, remaining: 0 },
  shrines: { destroyed: 0, remaining: 0 },
  ancientDestroyed: false,
};

interface Dota2Player {
  id: string;
  name: string;
  teamId: string;
  accountId: number | null;
  teamSlot: number | null;
  heroId: number | null;
  heroName: string;
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  denies: number;
  totalGold: number;
  level: number;
  goldPerMin: number;
  xpPerMin: number;
  items: number[];
  itemNames: string[];
}

export interface Dota2GameState {
  mapNumber: number | null;
  gameTime: number;
  /** Day/night clock from Valve's match.time_of_day — float in [0..1].
   *  Null until the first full_state arrives. */
  timeOfDay: number | null;
  /** Night Stalker's ult forces night regardless of the natural cycle. */
  isNightStalkerNight: boolean;
  phase: string;
  teams: Record<string, Dota2Team>;
  players: Record<string, Dota2Player>;
  maps: Array<{ mapNumber: number; winnerId: string }>;
  heroMap: Record<string, string>;
  itemMap: Record<string, string>;
  /** Snapshot of player kill counts from the previous full_state, used to diff kills. */
  _prevPlayerKills: Record<string, number>;
  /** Prev destroyed-state per building (tower/barracks/ancient/shrine) —
   *  keyed `side:type:lane:tier`. Diff against next snapshot to emit
   *  tower_destroyed / barracks_destroyed / ancient_destroyed events. */
  _prevBuildings: Record<string, boolean>;
  /** Last known roshan_respawn_time (seconds). Going from 0/null → positive
   *  means Roshan was just killed. */
  _prevRoshanRespawn: number;
  /** Total Roshan kills this map. Per-team attribution is not in Valve's
   *  realtime feed (PandaScore exposes `roshan_kills` per side via heuristic
   *  inference); we surface the total only and let consumers correlate to
   *  aegis pickup via _aegisHolder if they need attribution. */
  roshanKills: number;
  /** First blood happens exactly once per map — latched so the 2nd+
   *  full_state snapshots don't re-emit. */
  _firstBloodEmitted: boolean;
  /** Snapshot of player net_worth — falling sharply while death count
   *  jumped is a buyback heuristic signal. */
  _prevPlayerNetWorth: Record<string, number>;
  /** Player id currently holding Aegis of the Immortal (item id 117), set
   *  when we first detect the item after a Roshan kill. Cleared either on
   *  the next roshan_respawn cycle or when the holder no longer has it in
   *  their inventory. */
  _aegisHolder: string | null;
}

export function createDota2State(): Dota2GameState {
  return {
    mapNumber: null,
    gameTime: 0,
    timeOfDay: null,
    isNightStalkerNight: false,
    phase: 'warmup',
    teams: {},
    players: {},
    maps: [],
    heroMap: {},
    itemMap: {},
    _prevPlayerKills: {},
    _prevBuildings: {},
    _prevRoshanRespawn: 0,
    roshanKills: 0,
    _firstBloodEmitted: false,
    _prevPlayerNetWorth: {},
    _aegisHolder: null,
  };
}

/** Dota item id for Aegis of the Immortal. Stable across patches. */
const AEGIS_ITEM_ID = 117;

function fmtTime(secs: number | null | undefined): string {
  if (secs == null) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function applyDota2FullState(state: Dota2GameState, payload: any): void {
  state.gameTime = payload.gameTime || state.gameTime;
  state.mapNumber = payload.mapNumber || state.mapNumber;
  if (payload.timeOfDay != null) state.timeOfDay = payload.timeOfDay;
  if (payload.isNightStalkerNight != null) {
    state.isNightStalkerNight = !!payload.isNightStalkerNight;
  }

  for (const sideKey of ['radiant', 'dire'] as const) {
    const team = payload[sideKey];
    if (!team) continue;
    const teamId = String(team.id);
    if (!state.teams[teamId]) {
      state.teams[teamId] = {
        id: teamId,
        name: '',
        side: sideKey,
        totalKills: 0,
        totalGold: 0,
        structures: { ...EMPTY_STRUCTURES },
      };
    }
    Object.assign(state.teams[teamId], {
      name: team.name,
      totalKills: team.totalKills,
      totalGold: team.totalGold,
      structures: team.structures ?? state.teams[teamId].structures,
    });

    for (const p of team.players || []) {
      const id = String(p.id);
      // Translator (valve-dota) resolves names from dotaconstants and passes
      // them through; for raw provider payloads without pre-resolved names, fall
      // back to state maps (historically unpopulated — left in place for
      // future provider-side seeding), then to a placeholder.
      const heroName: string = p.heroName
        ?? state.heroMap[String(p.heroId)]
        ?? (p.heroId ? `Hero ${p.heroId}` : 'Unknown');
      const itemNames: string[] = Array.isArray(p.itemNames) && p.itemNames.length
        ? p.itemNames
        : (p.items || [])
            .map((itemId: number) => state.itemMap[String(itemId)] || '')
            .filter(Boolean);

      state.players[id] = {
        id,
        name: p.name,
        teamId,
        accountId: p.accountId ?? null,
        teamSlot: p.teamSlot ?? null,
        heroId: p.heroId,
        heroName,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        lastHits: p.lastHits,
        denies: p.denies,
        totalGold: p.totalGold,
        level: p.level,
        goldPerMin: p.goldPerMin,
        xpPerMin: p.xpPerMin,
        items: p.items || [],
        itemNames,
      };
    }
  }
}

/** Team-id lookup from a kill event's player — used to attribute team name
 *  to first_blood / roshan events. */
function teamNameFor(teamId: string, state: Dota2GameState, fixtureTeams: Record<string, any>): string {
  return fixtureTeams[teamId]?.name || state.teams[teamId]?.name || '';
}

/** Side → teamId resolver using the translator's per-side team id assignment. */
function teamIdForSide(state: Dota2GameState, side: 'radiant' | 'dire'): string | null {
  for (const [id, t] of Object.entries(state.teams)) {
    if (t.side === side) return id;
  }
  return null;
}

/**
 * Human-readable label for a building. type is 0=tower, 1=rax, 2=ancient,
 * 3=shrine. lane is 0=base, 1=top, 2=mid, 3=bot. tier is 1–4. These align
 * with Valve's API docs.
 */
function buildingLabel(b: { type: number; lane: number; tier: number }): {
  noun: string; desc: string; feedType: string; importance: 'low' | 'medium' | 'high' | 'critical';
} {
  const laneName = ['Base', 'Top', 'Mid', 'Bot'][b.lane] ?? `Lane ${b.lane}`;
  if (b.type === 2) {
    return { noun: 'Ancient', desc: 'Ancient', feedType: 'ancient_destroyed', importance: 'critical' };
  }
  if (b.type === 1) {
    // Barracks tier is melee/ranged — we don't know which without geometry.
    return { noun: 'barracks', desc: `${laneName} barracks`, feedType: 'barracks_destroyed', importance: 'high' };
  }
  if (b.type === 3) {
    return { noun: 'shrine', desc: 'Shrine', feedType: 'shrine_destroyed', importance: 'medium' };
  }
  // type === 0 — tower
  return { noun: 'tower', desc: `Tier ${b.tier || '?'} ${laneName.toLowerCase()} tower`, feedType: 'tower_destroyed', importance: 'high' };
}

/**
 * Diff building snapshots between polls. Emits tower_destroyed /
 * barracks_destroyed / ancient_destroyed / shrine_destroyed for each
 * building whose `destroyed` flag transitioned false → true.
 */
function detectStructureDestroyed(
  state: Dota2GameState,
  payloadBuildings: Array<{ team: string; type: number; lane: number; tier: number; destroyed: boolean; hp: number }>,
  feedBase: Pick<LiveFeedRow, 'event_id' | 'source_id' | 'league_id'>,
  sortIndex: number,
  fixtureTeams: Record<string, any>,
): LiveFeedRow[] {
  const out: LiveFeedRow[] = [];
  let offset = 0;
  const next = new Map<string, boolean>();
  for (const b of payloadBuildings) {
    const key = `${b.team}:${b.type}:${b.lane}:${b.tier}`;
    next.set(key, b.destroyed);
    const prev = state._prevBuildings[key];
    // First snapshot: prev === undefined. We'd only emit if already
    // destroyed AND this is a fresh match, which isn't useful, so require
    // an explicit false→true transition.
    if (prev === false && b.destroyed === true) {
      const label = buildingLabel(b);
      const side = b.team as 'radiant' | 'dire';
      const destroyerSide: 'radiant' | 'dire' = side === 'radiant' ? 'dire' : 'radiant';
      const destroyerTeamId = teamIdForSide(state, destroyerSide);
      const destroyerName = destroyerTeamId
        ? teamNameFor(destroyerTeamId, state, fixtureTeams) || destroyerSide
        : destroyerSide;
      out.push({
        ...feedBase,
        sort_index: sortIndex + offset++,
        feed_type: label.feedType,
        importance: label.importance,
        occurred_at: null,
        data: {
          text: `${destroyerName} destroyed a ${side} ${label.noun}`,
          subtext: label.desc,
          side,
          destroyerSide,
          destroyerTeamId,
          buildingType: b.type,
          lane: b.lane,
          tier: b.tier,
        },
      });
    }
  }
  // Swap in the new snapshot for next diff.
  state._prevBuildings = Object.fromEntries(next);
  return out;
}

/**
 * Aegis pickup detection. After Roshan dies the Aegis of the Immortal
 * (item_id 117) drops for the killing team. Scan every player's inventory
 * for the item — the first one holding it is the aegis carrier. Emits
 * once per roshan kill (latched via state._aegisHolder). Clears the latch
 * if the holder no longer has it (expired or consumed).
 */
function detectAegisPickup(
  state: Dota2GameState,
  feedBase: Pick<LiveFeedRow, 'event_id' | 'source_id' | 'league_id'>,
  sortIndex: number,
  fixtureTeams: Record<string, any>,
): LiveFeedRow[] {
  const out: LiveFeedRow[] = [];
  let currentHolder: string | null = null;
  for (const [id, p] of Object.entries(state.players)) {
    if (p.items?.includes(AEGIS_ITEM_ID)) {
      currentHolder = id;
      break;
    }
  }
  // Holder changed (or newly picked up) — emit. The first pickup after
  // a roshan kill is the notable event; subsequent holder changes (aegis
  // steal) are also noteworthy.
  if (currentHolder && currentHolder !== state._aegisHolder) {
    const holder = state.players[currentHolder];
    if (holder) {
      const teamName = teamNameFor(holder.teamId, state, fixtureTeams);
      const isSteal = state._aegisHolder !== null;
      out.push({
        ...feedBase,
        sort_index: sortIndex,
        feed_type: isSteal ? 'aegis_stolen' : 'aegis_pickup',
        importance: isSteal ? 'critical' : 'high',
        occurred_at: null,
        data: {
          text: isSteal
            ? `Aegis stolen by ${holder.name}!`
            : `${holder.name} picked up Aegis`,
          subtext: `${holder.heroName || 'Unknown hero'} · ${teamName}`,
          actors: [holder.name],
          playerId: currentHolder,
          heroName: holder.heroName,
          teamId: holder.teamId,
        },
      });
    }
  }
  state._aegisHolder = currentHolder;
  return out;
}

/**
 * Roshan kill detection. `roshan_respawn_time` is 0 when Roshan is alive
 * and up to ~11 min when dead (normal 8-11min respawn window). A
 * transition from 0 → >0 signals Roshan was just slain. Attribution to a
 * specific team isn't in the API — surface without actor.
 */
function detectRoshanSlain(
  state: Dota2GameState,
  payload: { roshan_respawn_time?: number | null },
  feedBase: Pick<LiveFeedRow, 'event_id' | 'source_id' | 'league_id'>,
  sortIndex: number,
): LiveFeedRow[] {
  const current = Math.max(0, payload.roshan_respawn_time ?? 0);
  const prev = state._prevRoshanRespawn;
  state._prevRoshanRespawn = current;
  if (prev <= 0 && current > 0) {
    state.roshanKills += 1;
    // Aegis window is the first ~5 minutes after a kill; used as a rough
    // signal in the subtext for ops folks scanning the feed.
    return [{
      ...feedBase,
      sort_index: sortIndex,
      feed_type: 'roshan_slain',
      importance: 'critical',
      occurred_at: null,
      data: {
        text: 'Roshan has been slain!',
        subtext: `Next spawn in ${Math.round(current / 60)}–${Math.round((current + 180) / 60)} min`,
        respawnIn: current,
      },
    }];
  }
  return [];
}

/**
 * Detect kills by diffing player kill counts between consecutive full_state snapshots.
 * Returns feed entries for any new kills detected.
 *
 * Also emits `first_blood` once per map — latched in state so it doesn't
 * re-fire on subsequent snapshots.
 */
function detectKillsFromDiff(
  state: Dota2GameState,
  feedBase: Pick<LiveFeedRow, 'event_id' | 'source_id' | 'league_id'>,
  sortIndex: number,
  fixtureTeams: Record<string, any>,
): LiveFeedRow[] {
  const entries: LiveFeedRow[] = [];
  const prevKills = state._prevPlayerKills;

  // Total kills before this snapshot — zero on the first tick of a new map
  // (prev map cleared _prevPlayerKills) or before any kills. If we land
  // on a tick where kills go 0 → >=1, the first one is first_blood.
  const prevTotal = Object.values(prevKills).reduce((s, n) => s + n, 0);
  let offset = 0;

  // Collect kill events first so we can prepend first_blood with the
  // correct actor if we detect the kills→first transition.
  type NewKill = { player: Dota2Player; newKills: number };
  const fresh: NewKill[] = [];
  for (const [, player] of Object.entries(state.players)) {
    const prev = prevKills[player.id] ?? 0;
    const newKills = player.kills - prev;
    if (newKills > 0) fresh.push({ player, newKills });
  }

  // First-blood — fires exactly once per map. The first fresh kill on the
  // 0 → N transition is the first-blood actor. Emitted before the kill
  // itself for narrative order in the feed.
  if (!state._firstBloodEmitted && prevTotal === 0 && fresh.length > 0) {
    state._firstBloodEmitted = true;
    const fbCandidate = fresh[0].player;
    const teamName = teamNameFor(fbCandidate.teamId, state, fixtureTeams);
    entries.push({
      ...feedBase,
      sort_index: sortIndex + offset++,
      feed_type: 'first_blood',
      importance: 'high',
      occurred_at: null,
      data: {
        text: `First blood by ${fbCandidate.name}!`,
        subtext: `${fbCandidate.heroName || 'Unknown hero'} · ${teamName}`,
        actors: [fbCandidate.name],
        playerId: fbCandidate.id,
        heroName: fbCandidate.heroName,
        teamId: fbCandidate.teamId,
      },
    });
  }

  for (const { player, newKills } of fresh) {
    const teamName = teamNameFor(player.teamId, state, fixtureTeams);
    entries.push({
      ...feedBase,
      sort_index: sortIndex + offset++,
      feed_type: 'kill',
      importance: newKills >= 2 ? 'high' : 'low',
      occurred_at: null,
      data: {
        text: `${player.name} got a kill (${player.kills} total)`,
        subtext: `${player.heroName || 'Unknown hero'} · ${teamName}`,
        actors: [player.name],
        playerId: player.id,
        kills: player.kills,
        heroName: player.heroName,
        newKills,
      },
    });
  }

  // Snapshot current kills for next diff
  state._prevPlayerKills = {};
  for (const [id, player] of Object.entries(state.players)) {
    state._prevPlayerKills[id] = player.kills;
  }

  return entries;
}

// --- Feed helper ---

function makeFeedRow(
  base: Pick<LiveFeedRow, 'event_id' | 'source_id' | 'league_id'>,
  sortIndex: number,
  feedType: string,
  importance: LiveFeedRow['importance'],
  data: Record<string, any>,
  occurredAt: string | null = null,
): LiveFeedRow {
  return {
    ...base,
    sort_index: sortIndex,
    feed_type: feedType,
    importance,
    occurred_at: occurredAt,
    data,
  };
}

// --- Main reducer ---

export function reduceDota2(
  prev: LiveStateRow,
  msg: EsportsLiveEvent,
): ReducerResult {
  const gameState: Dota2GameState = (prev.state.gameState as Dota2GameState | undefined) ?? createDota2State();
  const seriesScore: Record<string, number> = { ...((prev.state.seriesScore as Record<string, number> | undefined) || {}) };
  const teams: Record<string, any> = { ...((prev.state.teams as Record<string, any> | undefined) || {}) };

  let status = prev.status;
  let winnerId: string | null = (prev.state.winnerId as string | undefined) || null;

  const feed: LiveFeedRow[] = [];
  const feedBase = {
    event_id: prev.event_id,
    source_id: prev.source_id,
    league_id: prev.league_id,
  };

  const { type, payload } = msg;
  if (!payload) {
    return { state: { ...prev, sort_index: msg.sortIndex }, feed };
  }

  // --- Fixture-level events ---

  if (type === 'fixture_started') {
    status = 'live';
    for (const p of payload.participants || []) {
      const id = String(p.id);
      teams[id] = { id, name: p.name || '', imageUrl: p.imageUrl || '' };
      seriesScore[id] = p.score ?? 0;
    }
    feed.push(makeFeedRow(feedBase, msg.sortIndex, 'fixture_started', 'critical', {
      text: 'Series has begun!',
    }));
  }

  if (type === 'score_changed') {
    for (const s of payload.scores || []) {
      seriesScore[String(s.participantId)] = s.score;
    }
  }

  if (type === 'fixture_ended') {
    status = 'final';
    winnerId = payload.winnerId || null;
    const winnerName = teams[String(winnerId)]?.name || `Team ${winnerId}`;
    feed.push(makeFeedRow(feedBase, msg.sortIndex, 'fixture_ended', 'critical', {
      text: `${winnerName} wins the series!`,
      winnerId,
      actors: [winnerName],
    }));
  }

  // --- Occurrence-level events ---

  const name = payload.name;

  if (name === 'map_started') {
    gameState.mapNumber = payload.mapNumber;
    gameState.gameTime = 0;
    gameState.phase = 'live';
    gameState.teams = {};
    gameState.players = {};
    gameState._prevPlayerKills = {};
    // Reset per-map diff state so first_blood fires once per map and
    // buildings from the previous map don't leak forward as "already
    // destroyed" on the new map's fresh snapshot.
    gameState._prevBuildings = {};
    gameState._prevRoshanRespawn = 0;
    gameState.roshanKills = 0;
    gameState._firstBloodEmitted = false;
    gameState._prevPlayerNetWorth = {};
    gameState._aegisHolder = null;

    for (const p of payload.participants || []) {
      gameState.teams[String(p.id)] = {
        id: String(p.id),
        name: '',
        side: p.side,
        totalKills: 0,
        totalGold: 0,
        structures: { ...EMPTY_STRUCTURES },
      };
    }

    const sides = (payload.participants || [])
      .map((p: any) => `${teams[String(p.id)]?.name || p.id} (${p.side})`)
      .join(' vs ');
    feed.push(makeFeedRow(feedBase, msg.sortIndex, 'map_started', 'high', {
      text: `Game ${payload.mapNumber} has started`,
      subtext: sides,
      mapNumber: payload.mapNumber,
    }));
  }

  if (name === 'map_ended') {
    gameState.phase = 'map_end';
    feed.push(makeFeedRow(feedBase, msg.sortIndex, 'map_ended', 'high', {
      text: `Game ${payload.mapNumber} has ended`,
      mapNumber: payload.mapNumber,
      gameTime: payload.gameTime,
    }));
  }

  if (name === 'map_winner') {
    gameState.maps.push({
      mapNumber: payload.mapNumber,
      winnerId: String(payload.winnerId),
    });
    for (const p of payload.participants || []) {
      seriesScore[String(p.id)] = p.score;
    }
    const winnerName = teams[String(payload.winnerId)]?.name || `Team ${payload.winnerId}`;
    const scores = (payload.participants || [])
      .map((p: any) => `${p.name || teams[String(p.id)]?.name || p.id} ${p.score}`)
      .join(' — ');
    feed.push(makeFeedRow(feedBase, msg.sortIndex, 'map_winner', 'critical', {
      text: `${winnerName} wins Game ${payload.mapNumber}`,
      subtext: `Series: ${scores}`,
      winnerId: String(payload.winnerId),
      actors: [winnerName],
    }));
  }

  if (name === 'full_state') {
    applyDota2FullState(gameState, payload);
    // Diff against previous snapshot to surface rich in-game events:
    // kills, first-blood (latched), towers/barracks/ancient/shrines
    // destroyed, and Roshan kills. All four diffs share the incoming
    // sortIndex base — base-adapter helper bumps feed entries into
    // sequential indices so they don't collide on the unique constraint.
    const killEntries = detectKillsFromDiff(gameState, feedBase, msg.sortIndex, teams);
    feed.push(...killEntries);
    if (Array.isArray(payload.buildings)) {
      feed.push(...detectStructureDestroyed(gameState, payload.buildings, feedBase, msg.sortIndex, teams));
    }
    feed.push(...detectRoshanSlain(gameState, payload, feedBase, msg.sortIndex));
    feed.push(...detectAegisPickup(gameState, feedBase, msg.sortIndex, teams));
  }

  // Derive state row
  const period = gameState.phase === 'warmup' ? null
    : gameState.mapNumber != null ? `Game ${gameState.mapNumber}`
    : null;
  const clock = gameState.gameTime > 0 ? fmtTime(gameState.gameTime) : null;

  const teamIds = Object.keys(seriesScore);
  const homeScore = teamIds[0] ? seriesScore[teamIds[0]] : null;
  const awayScore = teamIds[1] ? seriesScore[teamIds[1]] : null;

  const finalState: LiveStateRow = {
    event_id: prev.event_id,
    source_id: prev.source_id,
    league_id: prev.league_id,
    status,
    period,
    clock,
    home_score: homeScore,
    away_score: awayScore,
    state: {
      gameState,
      seriesScore,
      teams,
      winnerId,
    },
    sort_index: msg.sortIndex,
  };

  return { state: finalState, feed };
}
