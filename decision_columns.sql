alter table bookings
  add column if not exists kind text,
  add column if not exists slots_wanted text,
  add column if not exists decision text not null default 'pending',
  add column if not exists reason text,
  add column if not exists options text,
  add column if not exists slot_assigned text,
  add column if not exists candidate text,
  add column if not exists trace text,
  add column if not exists decision_status text not null default 'waiting';

update bookings
set decision = 'pending'
where decision is null;

update bookings
set decision_status = 'waiting'
where decision_status is null;
