# Scoreboard — Next.js shared scorekeeper

A mobile-first shared scoreboard for four people to keep score of how many lies have been told. The UI is card-based, dark, glassy, and built in the same direction as the Rummy 500 scoring app: compact player cards, large score readouts, plus/minus controls, floating bottom actions, and fullscreen iPhone-safe layout.

## v6 features

This version is based on the stable v5 build and adds the next app layer:

- v5 layout preserved as the stable working base
- Compact scoreboard summary:
  - `Most lies`
  - `Amount of lies`
- Four player cards that fit on an iPhone screen with the scoreboard
- `+` and `−` controls for each player
- Editable player names without the typing reset bug
- Top liar highlight on the leading player card
- Tap/bump animation when a score changes
- Theme/background menu:
  - Warm glass
  - Midnight
  - Dusty
  - Photo mode using `public/bg.jpg`
- Room menu:
  - use a cleaner room name like `friday-night`
  - copy the current room link
  - open/create another room
- Better share button using native mobile sharing when possible
- Undo last score change
- Reset sheet:
  - scores only
  - names + scores
  - history only
- New scoreboard button inside the menu
- Game log/history on larger screens, hidden on mobile to preserve the iPhone layout
- Faster multi-device polling
- Status pill: saved/shared/sync/offline
- Haptic feedback on supported phones
- PWA install support:
  - manifest
  - app icons
  - service worker
  - iPhone Home Screen instructions fallback
- Server API persistence
- Optional Supabase persistence for durable multi-device Vercel deployment

## Background image

To use a custom background image:

1. Add your image here:

```txt
public/bg.jpg
```

2. Open the app menu.
3. Choose the `Photo` theme.

If `public/bg.jpg` is missing, the app still works and falls back to the dark gradient behind the photo layer.

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

Without Supabase, this app uses serverless-safe temporary storage at `/tmp/lie-ledger/games.json`, with an in-memory fallback if file storage is unavailable.

That prevents Vercel filesystem crashes, but temporary serverless storage is not durable. It can disappear after cold starts or redeploys.

## Durable multi-device deployment on Vercel

For reliable shared scoring across phones, add Supabase:

1. Create a Supabase project.
2. Run `docs/supabase.sql` in the Supabase SQL editor.
3. Add these environment variables in Vercel:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-or-secret-key
SUPABASE_TABLE=lie_score_games
```

The secret/service role key stays server-side only. It is never exposed to the browser. See `docs/supabase-setup.md` for exact dashboard steps.

## Build

```bash
npm run build
npm run start
```

## Project structure

```txt
app/
  api/games/[gameId]/route.js   Shared game API
  globals.css                   Liquid Glass UI system + themes
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
  apple-touch-icon.svg          iPhone home screen icon
  maskable-icon.svg             PWA maskable icon
  sw.js                         Service worker
```
