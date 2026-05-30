# Lie Ledger — Next.js scorekeeper

A mobile-first shared scoring app for four people to keep score of how many lies have been told. The UI is card-based, dark, glassy, and built in the same direction as the Rummy 500 scoring app: compact cards, large score readouts, plus/minus controls, floating bottom actions and fullscreen iPhone-safe layout.

## Features

- Four player cards
- `+` and `−` controls for each player
- Editable player names
- Shareable room link: `?game=lies-xxxx`
- Recent activity log
- Undo last score change
- Reset scores while keeping names
- Haptic feedback on supported phones
- PWA/standalone metadata
- Server API persistence
- Optional Supabase persistence for real multi-device Vercel deployment

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

This works across multiple devices on the same hosted Node server, but not as permanent storage on Vercel serverless deployments.

## True multi-device deployment on Vercel

For Vercel or other serverless hosting, use Supabase:

1. Create a Supabase project.
2. Run `docs/supabase.sql` in the Supabase SQL editor.
3. Add these environment variables in Vercel:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_TABLE=lie_score_games
```

The service role key stays server-side only. It is never exposed to the browser.

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
  storage.js                    Supabase/file storage adapter
docs/
  supabase.sql                  Optional hosted persistence table
public/
  icon.svg                      App icon
```
