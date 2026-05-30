# Scoreboard v6 handoff

## Stable base

v6 was built directly from the stable v5 app. Supabase storage, the API route, score actions, undo, reset and player-name saving all remain based on the latest working version.

## Important files

```txt
app/page.js
```

Client UI and interaction logic. It includes theme selection, room link controls, PWA install helper, name editing, scoring, sharing, undo and reset controls.

```txt
app/globals.css
```

Complete Liquid Glass UI system. Theme controls are implemented with `[data-theme]` on `.app-shell`.

```txt
public/bg.jpg
```

Optional custom background. Add this file manually, then choose the Photo theme in the app menu.

```txt
public/sw.js
```

Small service worker for PWA install support. API requests are deliberately not cached.

```txt
lib/storage.js
```

Supabase/local/tmp/memory storage adapter. No environment variable names changed from v5.

## Vercel environment variables

Use the same variables as v5:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_TABLE
```

## Current UI structure

1. Top glass title/status bar
2. Compact summary card:
   - Most lies
   - Amount of lies
3. 2x2 player card grid on mobile
4. Floating bottom controls:
   - Share
   - Undo
   - Reset
   - Menu
5. Menu sheet:
   - Theme/background
   - Room link
   - Install app
   - New scoreboard

## Notes for next development

- Preserve the current `sendAction` flow because it prevents the name-input reset bug.
- Do not cache `/api/` responses in the service worker.
- Keep the mobile cards compact unless the bottom controls are redesigned.
- To change backgrounds without code, put a new `bg.jpg` in `public/` and use the Photo theme.
