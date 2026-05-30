# Supabase setup for Scoreboard

Use this when the app is deployed on Vercel and needs reliable shared scoring across multiple devices.

## 1. Create the Supabase project

1. Go to the Supabase dashboard.
2. Create a new project.
3. Wait until the project database is ready.

## 2. Create the table

1. Open the project.
2. Go to **SQL Editor**.
3. Paste this SQL and run it:

```sql
create table if not exists public.lie_score_games (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists lie_score_games_updated_at_idx
  on public.lie_score_games (updated_at desc);
```

This is the same SQL as `docs/supabase.sql`.

## 3. Copy the values needed by Vercel

In Supabase, open the project settings/API area and copy:

- Project URL / Data API URL base, for `SUPABASE_URL`
- `service_role` key / secret service-role key, for `SUPABASE_SERVICE_ROLE_KEY`

Keep the service role key private. It must only be added to Vercel environment variables, not to client-side code.

## 4. Add Vercel environment variables

In Vercel, open the deployed project and go to **Settings → Environment Variables**. Add these three variables:

```txt
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_TABLE=lie_score_games
```

Add them for **Production**. If you use preview deployments, add them for **Preview** too.

## 5. Redeploy

Redeploy the Vercel project after adding the variables. Existing deployments will not automatically receive newly added environment variables.

## 6. Check it works

Open the app after redeploy. The status pill should say:

```txt
Saved · shared
```

If it says `Saved · temporary`, Vercel is still not receiving the Supabase environment variables.
