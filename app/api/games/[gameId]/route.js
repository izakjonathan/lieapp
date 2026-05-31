function normalizePlayerName(name){const t=(name||'').trim();return t.toLowerCase()==='tom'?'Gaylord McFuck':name;}
import { NextResponse } from "next/server";
import { applyGameAction, cleanGameId, createDefaultGame, sanitizeGame } from "@/lib/game";
import { getStoreMode, readGameFromStore, writeGameToStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const gameId = await resolveGameId(context);
    const storedGame = await readGameFromStore(gameId);
    const game = sanitizeGame(storedGame || createDefaultGame(gameId), gameId);

    if (!storedGame) await writeGameToStore(game);

    return NextResponse.json({ game, store: getStoreMode() }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request, context) {
  try {
    const gameId = await resolveGameId(context);
    const action = await request.json().catch(() => ({}));
    const storedGame = await readGameFromStore(gameId);
    const currentGame = sanitizeGame(storedGame || createDefaultGame(gameId), gameId);
    const nextGame = applyGameAction(currentGame, action);
    await writeGameToStore(nextGame);

    return NextResponse.json({ game: nextGame, store: getStoreMode() }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}

async function resolveGameId(context) {
  const params = await context?.params;
  const gameId = cleanGameId(params?.gameId);
  if (!gameId) {
    const error = new Error("Invalid game id. Use at least three letters, numbers, dashes or underscores.");
    error.status = 400;
    throw error;
  }
  return gameId;
}

function errorResponse(error) {
  console.error(error);
  return NextResponse.json(
    {
      error: error?.message || "Something went wrong."
    },
    {
      status: error?.status || 500,
      headers: noStoreHeaders()
    }
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
  };
}
