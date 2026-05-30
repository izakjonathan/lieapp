# Changelog

## v1.0.1

- Fixed Vercel crash: `ENOENT: no such file or directory, mkdir '/var/task/.data'`.
- Added serverless-safe `/tmp/lie-ledger/games.json` fallback when no Supabase env vars are configured.
- Added in-memory fallback if file storage is unavailable.
- Forced the game API route to Node.js runtime.
- Updated UI status labels so non-Supabase storage shows as temporary/local instead of shared.

## v1.0.0

- Initial Next.js Lie Ledger build.
- Four player score cards.
- Editable player names.
- Plus/minus scoring controls.
- Shared room URL.
- API-backed persistence.
- Optional Supabase persistence.
