-- Supabase SQL Editor에서 실행하세요.
-- 기존에 has_playground_access()를 사용하는 사진 정책이 있다면 먼저 제거하거나,
-- 이 파일의 정책으로 교체하세요. 익명 로그인은 기기마다 다른 사용자가 될 수 있으므로
-- 일기와 이미지는 모든 authenticated 익명 세션에서 함께 읽을 수 있게 합니다.

insert into storage.buckets (id, name, public)
values ('diary-images', 'diary-images', false)
on conflict (id) do update set public = false;

drop policy if exists "diary images are readable by authenticated users"
on storage.objects;
create policy "diary images are readable by authenticated users"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'diary-images'
);

drop policy if exists "diary images are uploadable by authenticated users"
on storage.objects;
create policy "diary images are uploadable by authenticated users"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'diary-images'
);

drop policy if exists "diary images are deletable by authenticated users"
on storage.objects;
create policy "diary images are deletable by authenticated users"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'diary-images'
);
