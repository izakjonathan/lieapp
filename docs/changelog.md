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
