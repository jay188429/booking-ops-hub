-- bookings 표 하나. Supabase SQL Editor 에 통째로 붙여넣고 Run.
-- 마지막 policy 두 줄까지 한 번에 붙여넣는다. 표만 만들고 멈추면 앱에서 아무것도 안 보인다.

create table bookings (
  id bigint generated always as identity primary key,
  customer text not null,
  service text not null,
  date text not null,
  time text not null,
  address text,
  status text not null default 'pending',
  via text not null default 'form',
  created_at timestamptz not null default now()
);

-- 잠금을 켠다. 켜기만 하면 아무도 못 쓴다 - 그래서 필요한 문만 아래에서 연다.
alter table bookings enable row level security;

-- 로그인한 사용자만 읽기·쓰기·수정할 수 있게 연다.
create policy "demo read" on bookings
  for select to authenticated
  using (true);

create policy "demo insert" on bookings
  for insert to authenticated
  with check (true);

create policy "demo update" on bookings
  for update to authenticated
  using (true)
  with check (true);
