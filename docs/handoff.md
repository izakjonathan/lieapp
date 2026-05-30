# Handoff — Scoreboard v4

## Stable base

This v4 build is based on the latest working v3 app, preserving:

- Supabase persistence support
- Vercel-safe fallback storage
- editable player names with no typing reset
- four-player score controls
- shareable room links

## Important files

```txt
app/page.js                    Main client UI and sync behaviour
app/api/games/[gameId]/route.js API route for loading/saving scoreboards
lib/game.js                    Game actions, history, reset logic
lib/storage.js                 Supabase + local/tmp/memory persistence
app/globals.css                Full Liquid Glass styling
```

## Data model

Each scoreboard stores:

```js
{
  id,
  title: "Scoreboard",
  createdAt,
  updatedAt,
  revision,
  players: [
    { id: "p1", name: "Player 1", score: 0 },
    { id: "p2", name: "Player 2", score: 0 },
    { id: "p3", name: "Player 3", score: 0 },
    { id: "p4", name: "Player 4", score: 0 }
  ],
  history: []
}
```

## Server actions

- `adjustScore`
- `renamePlayer`
- `resetScores`
- `resetBoard`
- `clearHistory`
- `undoLast`

## Deployment

Vercel environment variables:

```txt
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-or-service-role-key
SUPABASE_TABLE=lie_score_games
```

The Supabase key must stay in Vercel environment variables only. Do not put it in the browser or source code.

## Next recommended step

Add per-device names for the activity log so the history can show who made each change, for example `Izak's phone added +1 to Player 2`.
