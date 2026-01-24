-- Enable Row Level Security (RLS) on all tables (Best Practice)

-- 1. Games Table
create table public.games (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  identifier text not null, -- e.g., 'minecraft', 'hytale'
  total_time bigint default 0, -- synced total time in seconds
  last_session bigint default 0, -- last session duration
  created_at timestamptz default now(),
  unique(user_id, identifier)
);

alter table public.games enable row level security;

create policy "Users can view their own games"
on public.games for select
using (auth.uid() = user_id);

create policy "Users can insert their own games"
on public.games for insert
with check (auth.uid() = user_id);

create policy "Users can update their own games"
on public.games for update
using (auth.uid() = user_id);

-- 2. Playtime Entries Table (History)
create table public.playtime_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  game_identifier text not null,
  start_time timestamptz not null,
  duration int not null, -- seconds
  created_at timestamptz default now()
);

alter table public.playtime_entries enable row level security;

create policy "Users can view their own playtime entries"
on public.playtime_entries for select
using (auth.uid() = user_id);

create policy "Users can insert their own playtime entries"
on public.playtime_entries for insert
with check (auth.uid() = user_id);

-- Indexes for performance
create index idx_games_user_id on public.games(user_id);
create index idx_playtime_user_id on public.playtime_entries(user_id);
create index idx_playtime_game_id on public.playtime_entries(game_identifier);
