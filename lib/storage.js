const TABLE_NAME = process.env.SUPABASE_TABLE || "lie_score_games";
const SUPABASE_URL = trimTrailingSlash(process.env.SUPABASE_URL || "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const memoryGames = getGlobalMemoryStore();

export async function readGameFromStore(gameId) {
  if (hasSupabase) return readFromSupabase(gameId);
  return memoryGames[gameId] || null;
}

export async function writeGameToStore(game) {
  if (hasSupabase) return writeToSupabase(game);
  memoryGames[game.id] = game;
  return game;
}

export function getStoreMode() {
  if (hasSupabase) return "supabase";
  return "server-memory";
}

async function readFromSupabase(gameId) {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE_NAME)}?id=eq.${encodeURIComponent(gameId)}&select=payload`;
  const response = await fetch(url, {
    headers: supabaseHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Supabase read failed: ${response.status} ${await response.text()}`);
  }

  const rows = await response.json();
  return rows?.[0]?.payload || null;
}

async function writeToSupabase(game) {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE_NAME)}?on_conflict=id`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify([
      {
        id: game.id,
        payload: game,
        updated_at: game.updatedAt || new Date().toISOString()
      }
    ])
  });

  if (!response.ok) {
    throw new Error(`Supabase write failed: ${response.status} ${await response.text()}`);
  }

  return game;
}

function getGlobalMemoryStore() {
  if (!globalThis.__SCOREBOARD_MEMORY_GAMES__) {
    globalThis.__SCOREBOARD_MEMORY_GAMES__ = {};
  }
  return globalThis.__SCOREBOARD_MEMORY_GAMES__;
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
