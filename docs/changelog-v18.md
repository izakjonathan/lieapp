# Scoreboard v18 — Motion + Hierarchy

Built from v17 as the current working version.

## Changes

- Added score pop animation when player scores change.
- Added leader reveal animation in the hero scoreboard.
- Added trophy pulse animation for the active leader.
- Added up/down score glow feedback for +1 and -1.
- Added stronger leader card hierarchy and subdued non-leader cards.
- Refined hero scoreboard typography so leader name and score dominate.
- Reduced visual weight of bottom toolbar.
- Kept existing gameplay, editable names, Supabase sync, room links, share, undo, reset, menu, and themes.

## Build check

`npm run build` compiled and generated app pages successfully. The local sandbox command timed out during Next.js final trace collection after outputting successful compilation/static generation artifacts, so the package excludes `.next` and `node_modules` and should be deployed normally by Vercel.
