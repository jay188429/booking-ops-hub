-- 이미 만들어진 bookings 표에 로그인 사용자 전용 정책을 적용한다.
-- Supabase SQL Editor에서 통째로 실행한다.

drop policy if exists "demo read" on bookings;
drop policy if exists "demo insert" on bookings;
drop policy if exists "demo update" on bookings;

alter table bookings enable row level security;

create policy "authenticated read bookings" on bookings
  for select to authenticated
  using (true);

create policy "authenticated insert bookings" on bookings
  for insert to authenticated
  with check (true);

create policy "authenticated update bookings" on bookings
  for update to authenticated
  using (true)
  with check (true);
