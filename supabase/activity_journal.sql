-- Wklej cały skrypt w Supabase SQL Editor i uruchom.
-- Tabele przechowują datę rozpoczęcia dziennika oraz pojedyncze pola siatki aktywności.
-- Dostęp do obu tabel ma wyłącznie właściciel zalogowany przez Supabase Auth.

create table if not exists public.activity_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_date date not null,
  slot_index smallint not null check (slot_index between 0 and 14),
  activity text not null default '' check (char_length(activity) <= 2000),
  mood_percent smallint check (mood_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date, slot_index),
  constraint activity_entries_has_content check (char_length(btrim(activity)) > 0 or mood_percent is not null)
);

create index if not exists activity_entries_user_date_idx on public.activity_entries (user_id, activity_date);

alter table public.activity_settings enable row level security;
alter table public.activity_settings force row level security;
alter table public.activity_entries enable row level security;
alter table public.activity_entries force row level security;

revoke all on public.activity_settings from public, anon, authenticated;
revoke all on public.activity_entries from public, anon, authenticated;
grant select, insert, update, delete on public.activity_settings to authenticated;
grant select, insert, update, delete on public.activity_entries to authenticated;

drop policy if exists "activity_settings_select_own" on public.activity_settings;
drop policy if exists "activity_settings_insert_own" on public.activity_settings;
drop policy if exists "activity_settings_update_own" on public.activity_settings;
drop policy if exists "activity_settings_delete_own" on public.activity_settings;
drop policy if exists "activity_entries_select_own" on public.activity_entries;
drop policy if exists "activity_entries_insert_own" on public.activity_entries;
drop policy if exists "activity_entries_update_own" on public.activity_entries;
drop policy if exists "activity_entries_delete_own" on public.activity_entries;

create policy "activity_settings_select_own" on public.activity_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "activity_settings_insert_own" on public.activity_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activity_settings_update_own" on public.activity_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "activity_settings_delete_own" on public.activity_settings
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "activity_entries_select_own" on public.activity_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "activity_entries_insert_own" on public.activity_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activity_entries_update_own" on public.activity_entries
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "activity_entries_delete_own" on public.activity_entries
  for delete to authenticated using ((select auth.uid()) = user_id);
