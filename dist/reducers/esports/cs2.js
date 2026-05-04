export function createCS2State() {
    return {
        mapNumber: null,
        mapName: null,
        roundNumber: 0,
        halfNumber: 1,
        phase: 'warmup',
        roundsWon: {},
        sides: {},
        players: {},
        lastRoundWinner: null,
        lastRoundCondition: null,
        bombState: null,
        bombSite: null,
        maps: [],
        roundHistory: [],
        _firstKillEmittedForRound: false,
        _prevClutchWins: {},
    };
}
export function makeEmptyCS2Player(p) {
    return {
        id: String(p.id || ''),
        name: p.name || '',
        teamId: String(p.teamId || ''),
        side: p.side || '',
        kills: 0,
        deaths: 0,
        assists: 0,
        headshots: 0,
        flashAssists: 0,
        suicides: 0,
        entryKills: 0,
        entryDeaths: 0,
        multiKillRounds: 0,
        adr: 0,
        kast: 0,
        hp: 100,
        money: 0,
        kevlar: false,
        helmet: false,
        defuseKit: false,
        primaryWeapon: null,
        agent: null,
        dpr: 0,
        clutchWins: 0,
        bombPlanted: 0,
        bombDefused: 0,
        mvps: 0,
    };
}
export function ensureCS2Player(state, playerPayload) {
    if (!playerPayload)
        return;
    const id = String(playerPayload.id);
    if (!state.players[id]) {
        state.players[id] = makeEmptyCS2Player(playerPayload);
    }
    if (playerPayload.name)
        state.players[id].name = playerPayload.name;
    if (playerPayload.side)
        state.players[id].side = playerPayload.side;
    if (playerPayload.teamId)
        state.players[id].teamId = String(playerPayload.teamId);
}
function applyCS2FullState(state, payload) {
    if (payload.mapNumber != null)
        state.mapNumber = payload.mapNumber;
    if (payload.roundNumber != null)
        state.roundNumber = payload.roundNumber;
    if (payload.ct?.id)
        state.sides[String(payload.ct.id)] = 'CT';
    if (payload.terrorist?.id)
        state.sides[String(payload.terrorist.id)] = 'Terrorist';
    for (const sideKey of ['ct', 'terrorist']) {
        const team = payload[sideKey];
        if (!team)
            continue;
        for (const p of team.players || []) {
            const id = String(p.id);
            if (!state.players[id]) {
                state.players[id] = makeEmptyCS2Player(p);
            }
            // Translator-provided fields. Guard with ?? so a sparse payload
            // (e.g. pre-advancedStats reconnect gap) doesn't zero running
            // tallies that we've already accumulated in state.
            const cur = state.players[id];
            Object.assign(cur, {
                name: p.name,
                teamId: String(team.id),
                kills: p.kills ?? cur.kills,
                deaths: p.deaths ?? cur.deaths,
                assists: p.assists ?? cur.assists,
                headshots: p.headshots ?? cur.headshots,
                suicides: p.suicides ?? cur.suicides,
                flashAssists: p.flashAssists ?? cur.flashAssists,
                entryKills: p.entryKills ?? cur.entryKills,
                entryDeaths: p.entryDeaths ?? cur.entryDeaths,
                multiKillRounds: p.multiKillRounds ?? cur.multiKillRounds,
                adr: p.adr ?? cur.adr,
                kast: p.kast ?? cur.kast,
                hp: p.hp ?? cur.hp,
                money: p.money ?? cur.money,
                kevlar: p.kevlar ?? cur.kevlar,
                helmet: p.helmet ?? cur.helmet,
                defuseKit: p.defuseKit ?? cur.defuseKit,
                primaryWeapon: p.primaryWeapon ?? cur.primaryWeapon,
                agent: p.agent ?? cur.agent,
                dpr: p.dpr ?? cur.dpr,
                clutchWins: p.clutchWins ?? cur.clutchWins,
                bombPlanted: p.bombPlanted ?? cur.bombPlanted,
                bombDefused: p.bombDefused ?? cur.bombDefused,
                mvps: p.mvps ?? cur.mvps,
            });
        }
    }
}
// --- Feed helpers ---
function makeFeedRow(base, sortIndex, feedType, importance, data, occurredAt = null) {
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
export function reduceCS2(prev, msg) {
    const gameState = prev.state.gameState ?? createCS2State();
    const seriesScore = { ...(prev.state.seriesScore || {}) };
    const teams = { ...(prev.state.teams || {}) };
    let status = prev.status;
    let winnerId = prev.state.winnerId || null;
    const stateRow = { ...prev, sort_index: msg.sortIndex };
    const feed = [];
    const feedBase = {
        event_id: prev.event_id,
        source_id: prev.source_id,
        league_id: prev.league_id,
    };
    const { type, payload } = msg;
    if (!payload)
        return { state: stateRow, feed };
    // --- Fixture-level events (top-level type) ---
    if (type === 'fixture_started') {
        status = 'live';
        for (const p of payload.participants || []) {
            const id = String(p.id);
            teams[id] = { id, name: p.name || '', imageUrl: p.imageUrl || '' };
            seriesScore[id] = p.score ?? 0;
        }
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'fixture_started', 'critical', {
            text: 'Match has begun!',
        }));
    }
    if (type === 'score_changed') {
        for (const s of payload.scores || []) {
            seriesScore[String(s.participantId)] = s.score;
        }
    }
    if (type === 'fixture_ended') {
        status = 'final';
        for (const s of payload.scores || []) {
            seriesScore[String(s.participantId)] = s.score;
        }
        winnerId = payload.winnerId || null;
        const winnerName = teams[String(winnerId)]?.name || `Team ${winnerId}`;
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'fixture_ended', 'critical', {
            text: `${winnerName} wins the match!`,
            winnerId,
            actors: [winnerName],
        }));
    }
    // --- Occurrence-level events (payload.name) ---
    const name = payload.name;
    if (name === 'map_started') {
        gameState.mapNumber = payload.mapNumber;
        gameState.mapName = payload.mapName;
        gameState.roundNumber = 0;
        gameState.halfNumber = 1;
        gameState.phase = 'warmup';
        gameState.roundsWon = {};
        gameState.sides = {};
        gameState.players = {};
        gameState.bombState = null;
        gameState.bombSite = null;
        gameState.roundHistory = [];
        gameState._firstKillEmittedForRound = false;
        gameState._prevClutchWins = {};
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'map_started', 'high', {
            text: `Map ${payload.mapNumber} — ${payload.mapName}`,
            mapNumber: payload.mapNumber,
            mapName: payload.mapName,
        }));
    }
    if (name === 'map_ended') {
        gameState.phase = 'map_end';
        const mapRecord = {
            mapNumber: payload.mapNumber,
            mapName: gameState.mapName,
            winnerId: payload.winnerId || null,
            tie: payload.tie || false,
            roundsWon: {},
        };
        for (const p of payload.participants || []) {
            mapRecord.roundsWon[String(p.id)] = p.roundsWon;
        }
        gameState.maps.push(mapRecord);
        const winnerName = teams[String(payload.winnerId)]?.name || `Team ${payload.winnerId}`;
        const scores = (payload.participants || [])
            .map((p) => `${teams[String(p.id)]?.name || p.id} ${p.roundsWon}`)
            .join(' — ');
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'map_ended', 'critical', {
            text: `${winnerName} wins Map ${payload.mapNumber}`,
            subtext: scores,
            winnerId: String(payload.winnerId),
            actors: [winnerName],
        }));
    }
    if (name === 'map_voided') {
        gameState.mapNumber = null;
        gameState.mapName = null;
        gameState.roundNumber = 0;
        gameState.phase = 'warmup';
        gameState.players = {};
        gameState.roundsWon = {};
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'map_voided', 'high', {
            text: `Map ${payload.mapNumber || gameState.mapNumber} voided — restarting`,
        }));
    }
    if (name === 'half_started') {
        gameState.phase = 'round_live';
        gameState.halfNumber = (gameState.halfNumber || 1) + 1;
        for (const p of payload.participants || []) {
            gameState.sides[String(p.id)] = p.side;
        }
        const sideLines = (payload.participants || [])
            .map((p) => `${teams[String(p.id)]?.name || p.id} → ${p.side}`)
            .join(' · ');
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'half_started', 'medium', {
            text: 'Teams switch sides',
            subtext: sideLines,
        }));
    }
    if (name === 'half_ended') {
        gameState.phase = 'halftime';
    }
    if (name === 'round_started') {
        gameState.roundNumber = payload.roundNumber;
        gameState.halfNumber = payload.halfNumber || gameState.halfNumber;
        gameState.phase = 'round_live';
        gameState.bombState = null;
        gameState.bombSite = null;
        // Reset the per-round first-kill latch so the opening duel of the
        // next round gets surfaced again.
        gameState._firstKillEmittedForRound = false;
        const mapLabel = gameState.mapNumber ? `Map ${gameState.mapNumber}` : '';
        const halfLabel = gameState.halfNumber ? ` · Half ${gameState.halfNumber}` : '';
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'round_started', 'low', {
            text: `Round ${payload.roundNumber} started`,
            subtext: `${mapLabel}${halfLabel}`.trim(),
            roundNumber: payload.roundNumber,
            halfNumber: gameState.halfNumber,
            mapNumber: gameState.mapNumber,
        }));
    }
    if (name === 'round_ended') {
        gameState.phase = 'round_end';
        gameState.halfNumber = payload.halfNumber || gameState.halfNumber;
        gameState.lastRoundWinner = String(payload.winnerId);
        gameState.lastRoundCondition = payload.winCondition;
        for (const p of payload.participants || []) {
            gameState.roundsWon[String(p.id)] = p.roundsWon;
        }
        gameState.roundHistory.push({
            roundNumber: gameState.roundNumber,
            halfNumber: gameState.halfNumber,
            winnerId: String(payload.winnerId),
            winCondition: payload.winCondition,
        });
        const winnerName = teams[String(payload.winnerId)]?.name || `Team ${payload.winnerId}`;
        const scores = (payload.participants || [])
            .map((p) => `${teams[String(p.id)]?.name || p.id} ${p.roundsWon}`)
            .join(' — ');
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'round_ended', 'medium', {
            text: `${winnerName} wins Round ${payload.roundNumber}`,
            subtext: scores,
            winCondition: payload.winCondition,
            winnerId: String(payload.winnerId),
            roundNumber: payload.roundNumber,
            actors: [winnerName],
        }));
    }
    if (name === 'kill') {
        const killerPlayer = payload.killer?.player || payload.killer;
        const victimPlayer = payload.victim?.player || payload.victim;
        const killerId = String(killerPlayer?.id);
        const victimId = String(victimPlayer?.id);
        ensureCS2Player(gameState, killerPlayer);
        ensureCS2Player(gameState, victimPlayer);
        if (gameState.players[killerId]) {
            gameState.players[killerId].kills++;
            if (payload.headshot)
                gameState.players[killerId].headshots++;
        }
        if (gameState.players[victimId]) {
            gameState.players[victimId].deaths++;
        }
        const flags = [];
        if (payload.headshot)
            flags.push('HEADSHOT');
        if (payload.noScope)
            flags.push('NO SCOPE');
        if (payload.throughSmoke)
            flags.push('THROUGH SMOKE');
        if (payload.penetrated)
            flags.push('WALLBANG');
        if (payload.whileBlinded)
            flags.push('BLIND');
        const isSpecial = flags.length > 0;
        const flagText = flags.length > 0 ? ` [${flags.join(' + ')}]` : '';
        // Derive CT/T round scores from sides + roundsWon so the client can
        // render the per-kill scoreboard context.
        let ctScore = 0;
        let tScore = 0;
        for (const [tid, side] of Object.entries(gameState.sides)) {
            const rw = gameState.roundsWon[tid] ?? 0;
            if (side === 'CT')
                ctScore = rw;
            else if (side === 'Terrorist')
                tScore = rw;
        }
        const killerState = gameState.players[killerId];
        const killerStats = killerState ? {
            kills: killerState.kills,
            deaths: killerState.deaths,
            hsPct: killerState.kills > 0
                ? Math.round((killerState.headshots / killerState.kills) * 100)
                : 0,
            adr: Math.round(killerState.dpr || 0),
        } : null;
        const killerSide = gameState.sides[String(killerPlayer?.teamId || '')] || killerPlayer?.side || '';
        const victimSide = gameState.sides[String(victimPlayer?.teamId || '')] || victimPlayer?.side || '';
        // First kill (opening duel) of the round — surface as a dedicated
        // high-importance feed row before the generic kill row. Latched so
        // subsequent kills in the same round only show up as `kill`. Reset on
        // the next `round_started`.
        if (!gameState._firstKillEmittedForRound && gameState.phase === 'round_live') {
            gameState._firstKillEmittedForRound = true;
            feed.push(makeFeedRow(feedBase, msg.sortIndex, 'first_kill', 'high', {
                text: `Opening kill — ${killerPlayer?.name} → ${victimPlayer?.name}${flagText}`,
                subtext: `Round ${gameState.roundNumber} · ${teams[String(killerPlayer?.teamId)]?.name || killerSide}`,
                actors: [killerPlayer?.name, victimPlayer?.name],
                killer: { id: killerId, name: killerPlayer?.name, side: killerSide, teamId: String(killerPlayer?.teamId) },
                victim: { id: victimId, name: victimPlayer?.name, side: victimSide, teamId: String(victimPlayer?.teamId) },
                roundNumber: gameState.roundNumber,
                weapon: payload.weapon,
                headshot: !!payload.headshot,
            }));
        }
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'kill', isSpecial ? 'high' : 'low', {
            text: `${killerPlayer?.name} killed ${victimPlayer?.name}${flagText}`,
            subtext: `${teams[String(killerPlayer?.teamId)]?.name || ''} · ${payload.weapon || 'unknown'}`,
            actors: [killerPlayer?.name, victimPlayer?.name],
            killer: {
                id: killerId,
                name: killerPlayer?.name,
                teamId: String(killerPlayer?.teamId || ''),
                team: teams[String(killerPlayer?.teamId)]?.name || '',
                side: killerSide,
            },
            victim: {
                id: victimId,
                name: victimPlayer?.name,
                teamId: String(victimPlayer?.teamId || ''),
                team: teams[String(victimPlayer?.teamId)]?.name || '',
                side: victimSide,
            },
            weapon: payload.weapon,
            headshot: payload.headshot,
            noScope: payload.noScope,
            throughSmoke: payload.throughSmoke,
            penetrated: payload.penetrated,
            whileBlinded: payload.whileBlinded,
            // Map-coordinate enrichment — HLTV ships killer/victim (x,y) on
            // every log Kill entry and the translator computes euclidean
            // distance when the server didn't. GSK never had these.
            killerPosition: payload.killerPosition ?? null,
            victimPosition: payload.victimPosition ?? null,
            distance: payload.distance ?? null,
            mapNumber: gameState.mapNumber,
            roundNumber: gameState.roundNumber,
            ctScore,
            tScore,
            killerStats,
        }));
    }
    if (name === 'assist') {
        ensureCS2Player(gameState, payload.assister?.player);
        const id = String(payload.assister?.player?.id);
        if (gameState.players[id])
            gameState.players[id].assists++;
    }
    if (name === 'flash_assist') {
        ensureCS2Player(gameState, payload.assister?.player);
        const id = String(payload.assister?.player?.id);
        if (gameState.players[id])
            gameState.players[id].flashAssists++;
    }
    if (name === 'suicide') {
        ensureCS2Player(gameState, payload.player?.player);
        const id = String(payload.player?.player?.id);
        if (gameState.players[id]) {
            gameState.players[id].suicides++;
            gameState.players[id].deaths++;
        }
    }
    if (name === 'bomb_planted') {
        gameState.bombState = 'planted';
        gameState.bombSite = payload.bombSite || payload.planter?.bombSite || 'Unknown';
        const planter = payload.planter?.player || payload.planter || {};
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'bomb_planted', 'high', {
            text: `Bomb planted at ${gameState.bombSite} by ${planter.name || 'Unknown'}`,
            site: gameState.bombSite,
            planter: planter.name,
            actors: [planter.name],
        }));
    }
    if (name === 'bomb_exploded') {
        gameState.bombState = 'exploded';
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'bomb_exploded', 'high', {
            text: 'Bomb exploded!',
        }));
    }
    if (name === 'bomb_defused') {
        gameState.bombState = 'defused';
        const defuserName = payload.defuserName || payload.defuser?.player?.name || 'Unknown';
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'bomb_defused', 'high', {
            text: `Bomb defused by ${defuserName}`,
            actors: [defuserName],
        }));
    }
    if (name === 'round_mvp') {
        const playerRef = payload.player?.player ?? payload.player ?? null;
        const playerId = playerRef?.id ? String(playerRef.id) : null;
        const playerName = playerRef?.name || playerId || 'Unknown';
        if (playerId && gameState.players[playerId]) {
            gameState.players[playerId].mvps = (gameState.players[playerId].mvps ?? 0) + 1;
        }
        const reason = typeof payload.reason === 'string' ? payload.reason : null;
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'round_mvp', 'medium', {
            text: reason
                ? `${playerName} — round MVP (${reason})`
                : `${playerName} — round MVP`,
            actors: [playerName],
            reason,
            roundNumber: payload.roundNumber ?? gameState.roundNumber,
        }));
    }
    if (name === 'equipment_state') {
        for (const p of payload.players || []) {
            const id = String(p.playerId);
            if (!gameState.players[id])
                gameState.players[id] = makeEmptyCS2Player(p);
            Object.assign(gameState.players[id], {
                money: p.money,
                kevlar: p.kevlar,
                helmet: p.helmet,
                defuseKit: p.defuseKit,
                primaryWeapon: p.primaryWeapon,
            });
        }
    }
    // Accept every full-state event variant providers emit: legacy
    // `occurrence + name:full_state`, bare `full_state`, and the versioned
    // `cs2_v2_full_state` variant the HLTV translator ships (which is how
    // adr/kast/entryKills/etc. reach the player state at all).
    // vlr.gg's translator emits `entry_kill` from per-player `firstBloods.both`
    // deltas — use as the source of truth for the per-round opening duel
    // when the scorebot stream (HLTV) isn't available. Same `first_kill`
    // feed shape either way so the frontend gets a consistent type.
    if (name === 'entry_kill') {
        const playerName = payload.playerName ?? 'Unknown';
        const teamName = payload.team ?? '';
        const side = payload.side ?? null;
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'first_kill', 'high', {
            text: `Opening kill — ${playerName}`,
            subtext: [teamName, payload.agent, gameState.roundNumber ? `R${gameState.roundNumber}` : null].filter(Boolean).join(' · '),
            actors: [playerName],
            killer: {
                id: payload.playerId ? String(payload.playerId) : null,
                name: playerName,
                teamId: payload.teamId ? String(payload.teamId) : null,
                side,
                agent: payload.agent ?? null,
            },
            delta: payload.delta ?? 1,
            runningTotal: payload.runningTotal ?? null,
        }));
    }
    if ((type === 'occurrence' && name === 'full_state')
        || type === 'full_state'
        || type === 'cs2_v2_full_state') {
        // Clutch detection — before applyCS2FullState overwrites the merged
        // clutchWins counter, snapshot the pre-apply totals so we can diff
        // against the incoming payload. vlr.gg publishes this on its
        // performance page; HLTV scorebot carries the same field via the
        // full_state payload. Emits a `clutch` feed row for any player whose
        // running total ticked up.
        const clutchDeltas = [];
        const prevClutch = gameState._prevClutchWins ?? {};
        const payloadPlayers = [
            ...(payload.players ?? []),
            ...(payload.ctPlayers ?? []),
            ...(payload.tPlayers ?? []),
        ];
        for (const p of payloadPlayers) {
            if (!p || typeof p.clutchWins !== 'number')
                continue;
            const pid = String(p.id ?? p.playerId ?? '');
            if (!pid)
                continue;
            const prevC = prevClutch[pid] ?? gameState.players[pid]?.clutchWins ?? 0;
            if (p.clutchWins > prevC) {
                clutchDeltas.push({
                    playerId: pid,
                    playerName: p.name ?? gameState.players[pid]?.name ?? 'Unknown',
                    teamId: String(p.teamId ?? gameState.players[pid]?.teamId ?? ''),
                    side: p.side ?? gameState.players[pid]?.side,
                    agent: p.agent ?? p.championName,
                    total: p.clutchWins,
                });
            }
        }
        applyCS2FullState(gameState, payload);
        for (const c of clutchDeltas) {
            feed.push(makeFeedRow(feedBase, msg.sortIndex, 'clutch', 'critical', {
                text: `Clutch by ${c.playerName}!`,
                subtext: [c.agent, teams[c.teamId]?.name || c.teamId, gameState.roundNumber ? `R${gameState.roundNumber}` : null].filter(Boolean).join(' · '),
                actors: [c.playerName],
                player: { id: c.playerId, name: c.playerName, teamId: c.teamId, side: c.side, agent: c.agent },
                clutchTotal: c.total,
                roundNumber: gameState.roundNumber,
            }));
        }
        // Snapshot current clutchWins for the next diff.
        gameState._prevClutchWins = {};
        for (const [id, pl] of Object.entries(gameState.players)) {
            gameState._prevClutchWins[id] = pl.clutchWins ?? 0;
        }
    }
    // Derive period/clock/scores for the state row
    const period = gameState.phase === 'warmup' ? null
        : gameState.mapNumber != null ? `Map ${gameState.mapNumber} R${gameState.roundNumber}`
            : null;
    const teamIds = Object.keys(seriesScore);
    const homeScore = teamIds[0] ? seriesScore[teamIds[0]] : null;
    const awayScore = teamIds[1] ? seriesScore[teamIds[1]] : null;
    const finalState = {
        event_id: prev.event_id,
        source_id: prev.source_id,
        league_id: prev.league_id,
        status,
        period,
        clock: null,
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
//# sourceMappingURL=cs2.js.map