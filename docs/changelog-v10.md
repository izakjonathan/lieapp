# Scoreboard v10

Built from the uploaded v9 project.

## UI changes
- Header no longer shows the random room ID as the main title.
- Header now reads `Scoreboard` with the room name only as a small subtitle.
- Biggest Liar summary is now a compact single strip.
- Player cards are shorter and tighter for iPhone screens.
- Score is centered between `-5`, `-1`, `+1`, and `+5` controls.
- Leader highlight is subtler with a small trophy badge.
- Photo background theme has a darker/blurred overlay so cards stay readable.

## Deploy changes
- Updated app version to 1.0.10.
- Updated dependencies to current exact versions used in the successful local build.
- Removed package-lock to avoid sandbox/private registry URLs in Vercel installs.

## Build check
- `npm run build` completed successfully before cleaning the package for ZIP export.
