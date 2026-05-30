# Changelog

## v6

- Locked v5 as the stable base for further development.
- Added in-app theme/background menu.
- Added four theme modes: Warm glass, Midnight, Dusty, and Photo.
- Photo mode uses `public/bg.jpg` so the background can be changed without touching React code.
- Added compact menu sheet for theme, room name/link, install and new scoreboard.
- Added clean room name support by entering a slug such as `friday-night`.
- Added room link copy action.
- Added PWA service worker and maskable icon.
- Added install action with iPhone fallback instructions.
- Added top-liar player card highlight.
- Added score-change bump animation.
- Tightened mobile layout to keep scoreboard + four players inside the iPhone view.
- Kept Supabase API/storage unchanged from v5.

## v5

- Replaced the oversized stats section with only `Most lies` and `Amount of lies`.
- Tightened the mobile layout so the scoreboard + all 4 player cards fit better on iPhone.
- Hid the game log on mobile while keeping history data for undo/reset.

## v7 deployment fix

- Removed local filesystem fallback from the server storage adapter.
- Vercel/Supabase deployments now avoid Turbopack file-tracing warnings caused by `fs`, `path`, `os`, and dynamic `process.cwd()` storage paths.
- When Supabase env vars are missing, the app falls back to temporary server memory instead of trying to write files.
- Verified `npm run build` completes successfully after the change.

## v8 deployment hardening
- Rebuilt from the uploaded v7 package.
- Removed fragile Node engine pinning and replaced it with `>=22 <25`.
- Pinned Next/React dependencies exactly instead of using caret ranges.
- Regenerated package metadata and removed internal sandbox registry URLs from `package-lock.json`.
- Added `vercel.json` with explicit install/build settings.
- Verified `npm run build` succeeds locally with Next 16.2.6.
