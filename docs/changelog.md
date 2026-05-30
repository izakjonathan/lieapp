# Changelog

## v5

- Replaced the large summary section with a compact two-field scoreboard: `Most lies` and `Amount of lies`.
- Removed the oversized total/leader/last-change/events hero layout from the main screen.
- Tightened the mobile layout so the scoreboard and all four player input cards fit inside an iPhone viewport.
- Reduced player card height, score readout size, button height, topbar spacing, and bottom control height on mobile.
- Hid the game log on mobile so the four-player scoring interface stays visible and usable.
- Preserved Supabase syncing, share links, reset options, undo, and the existing saved data shape.

## v4

- Renamed the visible app experience to `Scoreboard`.
- Kept the room ID hidden from the UI while preserving shareable room links.
- Added native share support with clipboard fallback.
- Added a stronger game log with expandable history.
- Added reset options: scores only, names + scores, and history only.
- Added `resetBoard` and `clearHistory` server actions.
- Increased saved history from 80 to 120 events.
- Added faster multi-device polling.
- Improved status handling so unchanged background polls do not disturb the UI.
- Preserved the v3 fix that prevents player names from resetting while typing.
- Refined the Rummy-style Liquid Glass UI: stronger hero score, polished cards, bottom controls, and reset sheet.

## v3

- Fixed player names resetting while typing.
- Removed visible room ID/explanatory share text.
- Added Supabase setup docs.

## v2

- Fixed Vercel serverless storage crash by moving fallback storage to `/tmp`.
- Added in-memory fallback if file storage fails.

## v1

- Initial four-player Next.js scorekeeper.
