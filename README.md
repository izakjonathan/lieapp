# Lie Ledger — Next.js scorekeeper

A mobile-first shared scoring app for four people to keep score of how many lies have been told. The UI is card-based, dark, glassy, and built in the same direction as the Rummy 500 scoring app: compact cards, large score readouts, plus/minus controls, floating bottom actions and fullscreen iPhone-safe layout.

## Features

- Four player cards
- `+` and `−` controls for each player
- Editable player names
- Shareable game link in the browser URL
- Recent activity log
- Undo last score change
- Reset scores while keeping names
- Haptic feedback on supported phones
- PWA/standalone metadata
- Server API persistence
- Optional Supabase persistence for durable multi-device Vercel deployment

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

By default local/self-hosted mode saves games to:

```txt
.data/lie-ledger-games.json
```

## Vercel/serverless storage

This version no longer tries to create `.data` inside `/var/task` on Vercel. Without Supabase it uses serverless-safe temporary storage at `/tmp/lie-ledger/games.json`, with an in-memory fallback if file storage is unavailable.

That prevents the `ENOENT: no such file or directory, mkdir '/var/task/.data'` error, but temporary serverless storage is not durable. It can disappear after cold starts or redeploys.

## Durable multi-device deployment on Vercel

For reliable shared scoring across phones, add Supabase:

1. Create a Supabase project.
2. Run `docs/supabase.sql` in the Supabase SQL editor.
3. Add these environment variables in Vercel:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_TABLE=lie_score_games
```

The service role key stays server-side only. It is never exposed to the browser. See `docs/supabase-setup.md` for exact dashboard steps.

## Build

```bash
npm run build
npm run start
```

## Project structure

```txt
app/
  api/games/[gameId]/route.js   Shared game API
  globals.css                   Liquid Glass UI system
  layout.js                     App metadata + viewport
  manifest.js                   PWA manifest
  page.js                       Client app
lib/
  game.js                       Game state and action logic
  storage.js                    Supabase/file/tmp/memory storage adapter
docs/
  supabase.sql                  Optional hosted persistence table
  supabase-setup.md             Exact Supabase/Vercel setup steps
public/
  icon.svg                      App icon
```
