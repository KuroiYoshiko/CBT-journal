-- Wklej cały skrypt w Supabase SQL Editor i uruchom.
-- Nigdy nie umieszczaj service_role key w aplikacji przeglądarkowej.

create extension if not exists pgcrypto;

create table if not exists public.cbt_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  situation text not null check (char_length(btrim(situation)) between 1 and 5000),
  automatic_thought text not null check (char_length(btrim(automatic_thought)) between 1 and 5000),
  body_sensations text not null check (char_length(btrim(body_sensations)) between 1 and 5000),
  emotions jsonb not null check (jsonb_typeof(emotions) = 'array' and jsonb_array_length(emotions) > 0),
  behavior text not null check (char_length(btrim(behavior)) between 1 and 5000),
  distortions text[] not null default '{}',
  alternative_thought text check (alternative_thought is null or char_length(alternative_thought) <= 5000),
  created_at timestamptz not null default now()
);

create index if not exists cbt_entries_user_occurred_idx on public.cbt_entries (user_id, occurred_at desc);

alter table public.cbt_entries enable row level security;
alter table public.cbt_entries force row level security;

revoke all on public.cbt_entries from anon, authenticated;
grant select, insert, update, delete on public.cbt_entries to authenticated;

drop policy if exists "Users select own CBT entries" on public.cbt_entries;
drop policy if exists "Users insert own CBT entries" on public.cbt_entries;
drop policy if exists "Users update own CBT entries" on public.cbt_entries;
drop policy if exists "Users delete own CBT entries" on public.cbt_entries;

create policy "Users select own CBT entries" on public.cbt_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own CBT entries" on public.cbt_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own CBT entries" on public.cbt_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own CBT entries" on public.cbt_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);
