
function normalizePlayerName(name){
  const trimmed = (name || "").trim();
  return trimmed.toLowerCase() === "tom" ? "Gaylord McFuck" : trimmed;
}

export const DEFAULT_PLAYER_NAMES = ["Player 1", "Player 2", "Player 3", "Player 4"];
export const MAX_HISTORY_ITEMS = 120;

const PLAYER_IDS = ["p1", "p2", "p3", "p4"];

export function cleanGameId(value) {
  const raw = String(value || "").trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9_-]/g, "").slice(0, 64);
  if (safe.length < 3) return null;
  return safe;
}

export function createDefaultGame(id) {
  const now = new Date().toISOString();
  return {
    id,
    title: "Scoreboard",
    createdAt: now,
    updatedAt: now,
    revision: 1,
    players: PLAYER_IDS.map((playerId, index) => ({
      id: playerId,
      name: DEFAULT_PLAYER_NAMES[index],
      score: 0
    })),
    history: []
  };
}

export function sanitizeGame(input, id) {
  const base = createDefaultGame(id);
  if (!input || typeof input !== "object") return base;

  const incomingPlayers = Array.isArray(input.players) ? input.players : [];
  const players = base.players.map((player, index) => {
    const found = incomingPlayers.find((candidate) => candidate?.id === player.id) || incomingPlayers[index] || {};
    return {
      id: player.id,
      name: normalizePlayerName(cleanName)(found.name || player.name),
      score: cleanScore(found.score)
    };
  });

  const history = Array.isArray(input.history)
    ? input.history.slice(-MAX_HISTORY_ITEMS).map(cleanHistoryItem).filter(Boolean)
    : [];

  return {
    ...base,
    title: "Scoreboard",
    createdAt: typeof input.createdAt === "string" ? input.createdAt : base.createdAt,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : base.updatedAt,
    revision: Number.isFinite(Number(input.revision)) ? Number(input.revision) : base.revision,
    players,
    history
  };
}

export function applyGameAction(game, rawAction = {}) {
  const current = sanitizeGame(game, game.id);
  const action = rawAction && typeof rawAction === "object" ? rawAction : {};
  const now = new Date().toISOString();
  let changed = false;
  let nextHistory = [...current.history];
  const players = current.players.map((player) => ({ ...player }));

  if (action.type === "adjustScore") {
    const player = players.find((candidate) => candidate.id === action.playerId);
    const delta = clampInteger(action.delta, -99, 99);
    if (player && delta !== 0) {
      const previousScore = player.score;
      const nextScore = Math.max(0, previousScore + delta);
      if (nextScore !== previousScore) {
        player.score = nextScore;
        changed = true;
        nextHistory.push({
          id: makeEventId(),
          kind: "score",
          playerId: player.id,
          playerName: player.name,
          delta,
          previousScore,
          nextScore,
          at: now
        });
      }
    }
  }

  if (action.type === "renamePlayer") {
    const player = players.find((candidate) => candidate.id === action.playerId);
    const name = cleanName(action.name);
    if (player && name && player.name !== name) {
      const previousName = player.name;
      player.name = name;
      changed = true;
      nextHistory.push({
        id: makeEventId(),
        kind: "rename",
        playerId: player.id,
        previousName,
        nextName: name,
        at: now
      });
    }
  }

  if (action.type === "resetScores") {
    const hadScores = players.some((player) => player.score !== 0);
    if (hadScores) {
      players.forEach((player) => {
        player.score = 0;
      });
      changed = true;
      nextHistory.push({
        id: makeEventId(),
        kind: "resetScores",
        at: now
      });
    }
  }

  if (action.type === "resetBoard") {
    const hadChanges = players.some((player, index) => player.score !== 0 || player.name !== DEFAULT_PLAYER_NAMES[index]);
    if (hadChanges) {
      players.forEach((player, index) => {
        player.name = DEFAULT_PLAYER_NAMES[index];
        player.score = 0;
      });
      changed = true;
      nextHistory.push({
        id: makeEventId(),
        kind: "resetBoard",
        at: now
      });
    }
  }

  if (action.type === "clearHistory") {
    if (nextHistory.length) {
      nextHistory = [];
      changed = true;
    }
  }

  if (action.type === "undoLast") {
    const lastScoreIndex = findLastIndex(nextHistory, (item) => item?.kind === "score");
    if (lastScoreIndex !== -1) {
      const event = nextHistory[lastScoreIndex];
      const player = players.find((candidate) => candidate.id === event.playerId);
      if (player) {
        player.score = cleanScore(event.previousScore);
        nextHistory.splice(lastScoreIndex, 1);
        changed = true;
        nextHistory.push({
          id: makeEventId(),
          kind: "undo",
          playerId: player.id,
          playerName: player.name,
          at: now
        });
      }
    }
  }

  if (!changed) return current;

  return sanitizeGame(
    {
      ...current,
      title: "Scoreboard",
      players,
      history: nextHistory.slice(-MAX_HISTORY_ITEMS),
      revision: current.revision + 1,
      updatedAt: now
    },
    current.id
  );
}

function cleanName(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim().slice(0, 28);
  return clean || "Player";
}

function cleanScore(value) {
  return clampInteger(value, 0, 9999);
}

function cleanHistoryItem(item) {
  if (!item || typeof item !== "object") return null;
  const kind = String(item.kind || "event").slice(0, 24);
  return {
    ...item,
    id: String(item.id || makeEventId()).slice(0, 80),
    kind: kind === "reset" ? "resetScores" : kind,
    at: typeof item.at === "string" ? item.at : new Date().toISOString()
  };
}

function clampInteger(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return 0;
  return Math.min(max, Math.max(min, number));
}

function findLastIndex(array, predicate) {
  for (let index = array.length - 1; index >= 0; index -= 1) {
    if (predicate(array[index], index, array)) return index;
  }
  return -1;
}

function makeEventId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
