import { promises as fs } from "fs";
import path from "path";

const TABLE_NAME = process.env.SUPABASE_TABLE || "lie_score_games";
const SUPABASE_URL = trimTrailingSlash(process.env.SUPABASE_URL || "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const localStoragePath = path.resolve(
  process.cwd(),
  process.env.LIE_LEDGER_STORAGE_PATH || ".data/lie-ledger-games.json"
);

export async function readGameFromStore(gameId) {
  if (hasSupabase) return readFromSupabase(gameId);
  return readFromFile(gameId);
}

export async function writeGameToStore(game) {
  if (hasSupabase) return writeToSupabase(game);
  return writeToFile(game);
}

export function getStoreMode() {
  return hasSupabase ? "supabase" : "local-file";
}

async function readFromSupabase(gameId) {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE_NAME)}?id=eq.${encodeURIComponent(gameId)}&select=payload`;
  const response = await fetch(url, {
    headers: supabaseHeaders()
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

async function readFromFile(gameId) {
  const allGames = await readAllFileGames();
  return allGames[gameId] || null;
}

async function writeToFile(game) {
  const allGames = await readAllFileGames();
  allGames[game.id] = game;
  await fs.mkdir(path.dirname(localStoragePath), { recursive: true });
  await fs.writeFile(localStoragePath, JSON.stringify(allGames, null, 2), "utf8");
  return game;
}

async function readAllFileGames() {
  try {
    const content = await fs.readFile(localStoragePath, "utf8");
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}
