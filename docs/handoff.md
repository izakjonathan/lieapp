# Handoff

Current working version: v1.0.1

Use this folder as the latest working version for future edits. Preserve the API action model in `lib/game.js` so score changes are applied server-side instead of overwriting whole game state from stale clients.

Important files:

- `app/page.js` — UI and polling client.
- `app/globals.css` — complete visual system.
- `app/api/games/[gameId]/route.js` — game read/write endpoint. Forced to `runtime = "nodejs"`.
- `lib/game.js` — score, rename, reset and undo actions.
- `lib/storage.js` — Supabase or local/tmp/memory persistence.

Deployment note:

- Local/self-hosted Node uses `.data/lie-ledger-games.json`.
- Vercel/serverless without Supabase uses `/tmp/lie-ledger/games.json` and can fall back to memory. This prevents crashes but is temporary.
- Vercel/serverless with Supabase is the durable multi-device setup.
