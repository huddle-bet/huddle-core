export function createLoLState() {
    return {
        mapNumber: null,
        gameTime: 0,
        phase: 'warmup',
        teams: {},
        players: {},
        maps: [],
        lastObjective: null,
        lastDragonKillTime: null,
        baronKillerTeamId: null,
        lastBaronKillTime: null,
        _firstBloodEmitted: false,
        _killChains: {},
        _firstTowerEmitted: false,
    };
}
/** Riot's multi-kill definition: successive kills within a 10s window
 *  by the same champion, up to pentakill (5). */
const MULTI_KILL_WINDOW_SEC = 10;
const MULTI_KILL_LABELS = {
    2: 'Double Kill',
    3: 'Triple Kill',
    4: 'Quadra Kill',
    5: 'Pentakill',
};
function ensureLoLPlayer(state, playerPayload) {
    if (!playerPayload)
        return;
    const id = String(playerPayload.id);
    if (!state.players[id]) {
        state.players[id] = {
            id,
            name: playerPayload.name || '',
            teamId: String(playerPayload.teamId || ''),
            role: '',
            championName: '',
            kills: 0,
            deaths: 0,
            assists: 0,
            cs: 0,
            totalGold: 0,
            level: 1,
            currentHealth: 0,
            maxHealth: 0,
            items: [],
            wardsPlaced: 0,
            wardsDestroyed: 0,
            championDamageShare: 0,
            killParticipation: 0,
            combatStats: null,
            perkMetadata: null,
        };
    }
}
function normalizeDragon(raw) {
    if (!raw)
        return 'Unknown';
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}
function applyLoLFullState(state, payload) {
    state.gameTime = payload.gameTime || state.gameTime;
    for (const sideKey of ['blueTeam', 'redTeam']) {
        const team = payload[sideKey];
        if (!team)
            continue;
        const teamId = String(team.id);
        if (!state.teams[teamId]) {
            state.teams[teamId] = {
                id: teamId,
                name: '',
                side: sideKey === 'blueTeam' ? 'blue' : 'red',
                totalKills: 0,
                totalGold: 0,
                towers: 0,
                inhibitors: 0,
                dragons: [],
                barons: 0,
            };
        }
        Object.assign(state.teams[teamId], {
            name: team.name,
            totalKills: team.totalKills,
            totalGold: team.totalGold,
            towers: team.towers,
            inhibitors: team.inhibitors,
            dragons: (team.dragons || state.teams[teamId].dragons || []).map(normalizeDragon),
            barons: team.barons,
        });
        for (const p of team.players || []) {
            const id = String(p.id);
            state.players[id] = {
                id,
                name: p.name,
                teamId,
                role: p.role,
                championName: p.championName,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                cs: p.cs,
                totalGold: p.totalGold,
                level: p.level,
                currentHealth: p.currentHealth ?? p.hp ?? p.health ?? 0,
                maxHealth: p.maxHealth ?? p.maxHp ?? 0,
                items: p.items || [],
                wardsPlaced: p.wardsPlaced ?? 0,
                wardsDestroyed: p.wardsDestroyed ?? 0,
                championDamageShare: p.championDamageShare ?? 0,
                killParticipation: p.killParticipation ?? 0,
                combatStats: p.combatStats ?? null,
                perkMetadata: p.perkMetadata ?? null,
            };
        }
    }
}
function fmtTime(secs) {
    if (secs == null)
        return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
// --- Feed helper ---
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
export function reduceLoL(prev, msg) {
    const gameState = prev.state.gameState ?? createLoLState();
    const seriesScore = { ...(prev.state.seriesScore || {}) };
    const teams = { ...(prev.state.teams || {}) };
    let status = prev.status;
    let winnerId = prev.state.winnerId || null;
    const feed = [];
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
        gameState.lastObjective = null;
        gameState.lastDragonKillTime = null;
        gameState.baronKillerTeamId = null;
        gameState.lastBaronKillTime = null;
        gameState._firstBloodEmitted = false;
        gameState._killChains = {};
        gameState._firstTowerEmitted = false;
        for (const p of payload.participants || []) {
            gameState.teams[String(p.id)] = {
                id: String(p.id),
                name: '',
                side: p.side,
                totalKills: 0,
                totalGold: 0,
                towers: 0,
                inhibitors: 0,
                dragons: [],
                barons: 0,
            };
        }
        const sides = (payload.participants || [])
            .map((p) => `${teams[String(p.id)]?.name || p.id} (${p.side})`)
            .join(' vs ');
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'map_started', 'high', {
            text: `Game ${payload.mapNumber} has started`,
            subtext: sides,
            mapNumber: payload.mapNumber,
            // Per-side lineup roster (champion + role) that the lolesports
            // translator threads through on map_started. Lets consumers pin
            // lineups before the first full_state frame arrives.
            participants: payload.participants,
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
            .map((p) => `${p.name || teams[String(p.id)]?.name || p.id} ${p.score}`)
            .join(' — ');
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'map_winner', 'critical', {
            text: `${winnerName} wins Game ${payload.mapNumber}`,
            subtext: `Series: ${scores}`,
            winnerId: String(payload.winnerId),
            // teamName comes from the translator (resolved via teamLabel) — pass
            // it through on the feed row so machine consumers don't have to do
            // their own teams[] lookup. Falls back to the reducer-derived
            // winnerName when the translator didn't send one.
            teamName: payload.teamName ?? winnerName,
            actors: [winnerName],
        }));
    }
    if (name === 'kill') {
        gameState.gameTime = payload.gameTime || gameState.gameTime;
        const killerRaw = payload.killer?.player || payload.killer;
        const victimRaw = payload.victim?.player || payload.victim;
        const killerId = String(killerRaw?.id);
        const victimId = String(victimRaw?.id);
        ensureLoLPlayer(gameState, killerRaw);
        ensureLoLPlayer(gameState, victimRaw);
        for (const a of payload.assists || []) {
            ensureLoLPlayer(gameState, a);
            const aid = String(a.id);
            if (gameState.players[aid])
                gameState.players[aid].assists++;
        }
        if (gameState.players[killerId]) {
            gameState.players[killerId].kills++;
            const teamId = gameState.players[killerId].teamId;
            if (gameState.teams[teamId])
                gameState.teams[teamId].totalKills++;
        }
        if (gameState.players[victimId]) {
            gameState.players[victimId].deaths++;
        }
        const killerName = killerRaw?.name || 'Unknown';
        const victimName = victimRaw?.name || 'Unknown';
        const killerChamp = killerRaw?.championName || gameState.players[killerId]?.championName || '';
        const killerTeamId = String(killerRaw?.teamId || '');
        const assistNames = (payload.assists || []).map((a) => a?.name || a?.player?.name || 'Unknown');
        const subtextParts = [];
        if (killerChamp)
            subtextParts.push(killerChamp);
        if (assistNames.length)
            subtextParts.push(`Assists: ${assistNames.join(', ')}`);
        subtextParts.push(fmtTime(payload.gameTime));
        // First blood — fires on the opening champion kill of the map. Cheap
        // latch: set on first kill event through the reducer.
        if (!gameState._firstBloodEmitted) {
            gameState._firstBloodEmitted = true;
            const killerTeamName = teams[killerTeamId]?.name || gameState.teams[killerTeamId]?.name || '';
            feed.push(makeFeedRow(feedBase, msg.sortIndex, 'first_blood', 'critical', {
                text: `First blood — ${killerName} killed ${victimName}`,
                subtext: [killerChamp, killerTeamName, fmtTime(payload.gameTime)].filter(Boolean).join(' · '),
                actors: [killerName, victimName],
                killer: { id: killerId, name: killerName, champ: killerChamp, teamId: killerTeamId },
                victim: { id: victimId, name: victimName, teamId: String(victimRaw?.teamId || '') },
                gameTime: payload.gameTime,
            }));
        }
        // Multi-kill chain — double/triple/quadra/pentakill. Advance the
        // killer's chain if the gap since their last kill is within Riot's
        // 10s window, else reset. Emit a feed row only when the chain reaches
        // 2+ (i.e. the second, third, ... kill in the chain), so the series
        // "killer got 3 in a row" surfaces as one Triple Kill feed row rather
        // than five kill rows the frontend has to aggregate.
        const chains = gameState._killChains;
        const now = Number(payload.gameTime) || gameState.gameTime;
        const prev = chains[killerId];
        const chainCount = prev && (now - prev.lastGameTime) <= MULTI_KILL_WINDOW_SEC
            ? prev.count + 1
            : 1;
        chains[killerId] = { lastGameTime: now, count: chainCount };
        if (chainCount >= 2 && chainCount <= 5) {
            const label = MULTI_KILL_LABELS[chainCount];
            const importance = chainCount >= 4 ? 'critical' : chainCount === 3 ? 'high' : 'medium';
            feed.push(makeFeedRow(feedBase, msg.sortIndex, 'multi_kill', importance, {
                text: `${label}! ${killerName} (${killerChamp})`,
                subtext: fmtTime(now),
                actors: [killerName],
                killer: { id: killerId, name: killerName, champ: killerChamp, teamId: killerTeamId },
                killCount: chainCount,
                label,
                gameTime: now,
            }));
        }
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'kill', 'low', {
            text: `${killerName} killed ${victimName}`,
            subtext: subtextParts.filter(Boolean).join(' · '),
            actors: [killerName, victimName, ...assistNames],
            killer: { id: killerId, name: killerName, champ: killerChamp, teamId: killerRaw?.teamId },
            victim: { id: victimId, name: victimName, teamId: victimRaw?.teamId },
            assists: assistNames,
            gameTime: payload.gameTime,
        }));
    }
    if (name === 'tower_destroyed') {
        gameState.gameTime = payload.gameTime || gameState.gameTime;
        const teamId = String(payload.teamId);
        if (gameState.teams[teamId])
            gameState.teams[teamId].towers++;
        gameState.lastObjective = { type: 'tower', teamId };
        const t = teams[teamId]?.name || gameState.teams[teamId]?.name || `Team ${teamId}`;
        // First tower of the map — latched. Riot doesn't emit a distinct
        // "first tower" signal, so we infer from the first tower_destroyed
        // event per map. Emitted as a higher-importance feed row before the
        // generic tower_destroyed entry.
        if (!gameState._firstTowerEmitted) {
            gameState._firstTowerEmitted = true;
            feed.push(makeFeedRow(feedBase, msg.sortIndex, 'first_tower', 'high', {
                text: `First tower — ${t}`,
                subtext: fmtTime(payload.gameTime),
                actors: [t],
                teamId,
                gameTime: payload.gameTime,
            }));
        }
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'tower_destroyed', 'medium', {
            text: `${t} destroyed a tower`,
            subtext: fmtTime(payload.gameTime),
            actors: [t],
        }));
    }
    if (name === 'inhibitor_destroyed') {
        gameState.gameTime = payload.gameTime || gameState.gameTime;
        const teamId = String(payload.teamId);
        if (gameState.teams[teamId])
            gameState.teams[teamId].inhibitors++;
        gameState.lastObjective = { type: 'inhibitor', teamId };
        const t = teams[teamId]?.name || gameState.teams[teamId]?.name || `Team ${teamId}`;
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'inhibitor_destroyed', 'high', {
            text: `${t} destroyed an inhibitor`,
            subtext: fmtTime(payload.gameTime),
            actors: [t],
        }));
    }
    if (name === 'dragon_slain') {
        gameState.gameTime = payload.gameTime || gameState.gameTime;
        const teamId = String(payload.teamId);
        const normDrg = normalizeDragon(payload.dragon || '');
        if (gameState.teams[teamId]) {
            gameState.teams[teamId].dragons.push(normDrg);
        }
        gameState.lastDragonKillTime = gameState.gameTime;
        gameState.lastObjective = { type: 'dragon', teamId, detail: payload.dragon };
        const t = teams[teamId]?.name || gameState.teams[teamId]?.name || `Team ${teamId}`;
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'dragon_slain', normDrg === 'Elder' ? 'critical' : 'high', {
            text: `${t} killed the ${normDrg} Dragon`,
            subtext: fmtTime(payload.gameTime),
            actors: [t],
            dragon: normDrg,
        }));
    }
    if (name === 'baron_slain') {
        gameState.gameTime = payload.gameTime || gameState.gameTime;
        const teamId = String(payload.teamId);
        if (gameState.teams[teamId])
            gameState.teams[teamId].barons++;
        gameState.baronKillerTeamId = teamId;
        gameState.lastBaronKillTime = gameState.gameTime;
        gameState.lastObjective = { type: 'baron', teamId };
        const t = teams[teamId]?.name || gameState.teams[teamId]?.name || `Team ${teamId}`;
        feed.push(makeFeedRow(feedBase, msg.sortIndex, 'baron_slain', 'critical', {
            text: `${t} killed Baron Nashor`,
            subtext: fmtTime(payload.gameTime),
            actors: [t],
        }));
    }
    if (name === 'full_state' || type === 'lol_v2_full_state') {
        applyLoLFullState(gameState, payload);
    }
    // Derive state row
    const period = gameState.phase === 'warmup' ? null
        : gameState.mapNumber != null ? `Game ${gameState.mapNumber}`
            : null;
    const clock = gameState.gameTime > 0 ? fmtTime(gameState.gameTime) : null;
    const teamIds = Object.keys(seriesScore);
    const homeScore = teamIds[0] ? seriesScore[teamIds[0]] : null;
    const awayScore = teamIds[1] ? seriesScore[teamIds[1]] : null;
    const finalState = {
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
//# sourceMappingURL=lol.js.map