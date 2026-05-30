import { promises as fs } from "fs";
import os from "os";
import path from "path";

const TABLE_NAME = process.env.SUPABASE_TABLE || "lie_score_games";
const SUPABASE_URL = trimTrailingSlash(process.env.SUPABASE_URL || "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const memoryGames = getGlobalMemoryStore();
let fallbackMode = null;

const localStoragePath = getLocalStoragePath();

export async function readGameFromStore(gameId) {
  if (hasSupabase) return readFromSupabase(gameId);
  return readFromFile(gameId);
}

export async function writeGameToStore(game) {
  if (hasSupabase) return writeToSupabase(game);
  return writeToFile(game);
}

export function getStoreMode() {
  if (hasSupabase) return "supabase";
  if (fallbackMode) return fallbackMode;
  if (isServerlessRuntime()) return "server-tmp";
  return "local-file";
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
  memoryGames[game.id] = game;

  try {
    await fs.mkdir(path.dirname(localStoragePath), { recursive: true });
    await fs.writeFile(localStoragePath, JSON.stringify(allGames, null, 2), "utf8");
  } catch (error) {
    fallbackMode = "server-memory";
    console.warn(`Lie Ledger file storage unavailable at ${localStoragePath}. Falling back to in-memory storage.`, error);
  }

  return game;
}

async function readAllFileGames() {
  try {
    const content = await fs.readFile(localStoragePath, "utf8");
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      Object.assign(memoryGames, parsed);
      return parsed;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      fallbackMode = "server-memory";
      console.warn(`Lie Ledger could not read ${localStoragePath}. Using in-memory store.`, error);
    }
  }

  return { ...memoryGames };
}

function getLocalStoragePath() {
  if (process.env.LIE_LEDGER_STORAGE_PATH) {
    return path.resolve(process.env.LIE_LEDGER_STORAGE_PATH);
  }

  if (isServerlessRuntime()) {
    return path.join(os.tmpdir(), "lie-ledger", "games.json");
  }

  return path.resolve(process.cwd(), ".data/lie-ledger-games.json");
}

function getGlobalMemoryStore() {
  if (!globalThis.__LIE_LEDGER_MEMORY_GAMES__) {
    globalThis.__LIE_LEDGER_MEMORY_GAMES__ = {};
  }
  return globalThis.__LIE_LEDGER_MEMORY_GAMES__;
}

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.NEXT_RUNTIME === "nodejs-serverless"
  );
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
