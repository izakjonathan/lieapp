-- Optional Supabase persistence for Vercel/serverless multi-device use.
-- Create this table in the Supabase SQL editor, then set the env values from .env.example in Vercel.

create table if not exists public.lie_score_games (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists lie_score_games_updated_at_idx
  on public.lie_score_games (updated_at desc);
