-- Uruchom cały skrypt w Supabase SQL Editor.
-- Osobna tabela ćwiczeń „Strzałka w dół”. Nie zmienia wcześniejszych dzienników.

create table if not exists public.downward_arrow_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  situation text not null check (char_length(btrim(situation)) between 1 and 500),
  answers text[] not null check (
    cardinality(answers) between 1 and 8
    and array_position(answers, null::text) is null
    and array_position(answers, '') is null
    and char_length(array_to_string(answers, '')) + char_length(situation) <= 1600
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists downward_arrow_exercises_user_created_idx
  on public.downward_arrow_exercises (user_id, created_at desc);

alter table public.downward_arrow_exercises enable row level security;
alter table public.downward_arrow_exercises force row level security;

revoke all on public.downward_arrow_exercises from public, anon, authenticated;
grant select, insert, update, delete on public.downward_arrow_exercises to authenticated;

drop policy if exists "downward_arrow_select_own" on public.downward_arrow_exercises;
drop policy if exists "downward_arrow_insert_own" on public.downward_arrow_exercises;
drop policy if exists "downward_arrow_update_own" on public.downward_arrow_exercises;
drop policy if exists "downward_arrow_delete_own" on public.downward_arrow_exercises;

create policy "downward_arrow_select_own" on public.downward_arrow_exercises
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "downward_arrow_insert_own" on public.downward_arrow_exercises
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "downward_arrow_update_own" on public.downward_arrow_exercises
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "downward_arrow_delete_own" on public.downward_arrow_exercises
  for delete to authenticated using ((select auth.uid()) = user_id);
