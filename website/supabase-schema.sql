create extension if not exists "pgcrypto";

create table if not exists public.calendar_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  records jsonb not null default '{}'::jsonb,
  events jsonb not null default '{}'::jsonb,
  supplements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists calendar_data_user_id_key on public.calendar_data(user_id);

alter table public.calendar_data enable row level security;

create policy "Users can read their own calendar data"
  on public.calendar_data for select
  using (auth.uid() = user_id);

create policy "Users can insert their own calendar data"
  on public.calendar_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own calendar data"
  on public.calendar_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own calendar data"
  on public.calendar_data for delete
  using (auth.uid() = user_id);
