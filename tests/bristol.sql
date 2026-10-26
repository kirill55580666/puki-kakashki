-- Run after the Bristol migration. Fixtures and mutations are rolled back.
begin;
insert into auth.users (id, aud, role, email) values
('2b98ce39-fcaa-489c-957b-25b366ed1211', 'authenticated', 'authenticated', 'bristol-a@example.invalid'),
('2b98ce39-fcaa-489c-957b-25b366ed1212', 'authenticated', 'authenticated', 'bristol-b@example.invalid');
insert into public.events(user_id, type, occurred_at, bristol_type)
select '2b98ce39-fcaa-489c-957b-25b366ed1211', 'poop', now(), n from generate_series(1, 7) n;
insert into public.events(user_id, type, occurred_at, bristol_type) values
('2b98ce39-fcaa-489c-957b-25b366ed1211', 'poop', now(), null),
('2b98ce39-fcaa-489c-957b-25b366ed1212', 'poop', now(), 4);
set local role authenticated;
select set_config('request.jwt.claim.sub', '2b98ce39-fcaa-489c-957b-25b366ed1211', true);
do $$
declare affected integer;
begin
  if (select count(*) from public.events) <> 8 then raise exception 'Bristol SELECT isolation failed'; end if;
  if (select count(distinct bristol_type) from public.events) <> 7 then raise exception 'Seven stool types were not preserved'; end if;
  update public.events set bristol_type = 5 where user_id = '2b98ce39-fcaa-489c-957b-25b366ed1212';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user Bristol UPDATE was allowed'; end if;
  update public.events set bristol_type = 3 where bristol_type = 4;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Own Bristol UPDATE failed'; end if;
  begin
    insert into public.events(user_id, type, occurred_at, bristol_type) values
    ('2b98ce39-fcaa-489c-957b-25b366ed1211', 'poop', now(), 8);
    raise exception 'Invalid Bristol type was allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.events(user_id, type, occurred_at, bristol_type) values
    ('2b98ce39-fcaa-489c-957b-25b366ed1211', 'fart', now(), 4);
    raise exception 'Bristol type on a fart was allowed';
  exception when check_violation then null;
  end;
  update public.events set bristol_type = null;
  if exists(select 1 from public.events where bristol_type is not null) then raise exception 'Clearing Bristol type failed'; end if;
end $$;
reset role;
rollback;
select 'Bristol constraints and RLS passed; fixtures rolled back' as result;
