-- Supabase SQL Editor에서 실행하세요.
-- 익명 사용자는 authenticated 역할로 동작하므로 authenticated 정책을 사용합니다.

alter table public.diary_entries
add column if not exists images jsonb not null default '[]'::jsonb;

alter table public.diary_entries
add column if not exists cover_image text;

alter table public.diary_entries enable row level security;

grant select, insert, update, delete on table public.diary_entries to authenticated;

drop policy if exists "diary entries are readable by authenticated users"
on public.diary_entries;
create policy "diary entries are readable by authenticated users"
on public.diary_entries
for select
to authenticated
using (true);

drop policy if exists "diary entries are insertable by authenticated users"
on public.diary_entries;
create policy "diary entries are insertable by authenticated users"
on public.diary_entries
for insert
to authenticated
with check (true);

drop policy if exists "diary entries are updatable by authenticated users"
on public.diary_entries;
create policy "diary entries are updatable by authenticated users"
on public.diary_entries
for update
to authenticated
using (true)
with check (true);

drop policy if exists "diary entries are deletable by authenticated users"
on public.diary_entries;
create policy "diary entries are deletable by authenticated users"
on public.diary_entries
for delete
to authenticated
using (true);
