-- Run in Supabase SQL Editor. All fixtures are rolled back.
begin;
insert into auth.users (id, aud, role, email) values
('1a98ce39-fcaa-489c-957b-25b366ed1211', 'authenticated', 'authenticated', 'rls-a@example.invalid'),
('1a98ce39-fcaa-489c-957b-25b366ed1212', 'authenticated', 'authenticated', 'rls-b@example.invalid');
insert into public.events(user_id,type,occurred_at) values
('1a98ce39-fcaa-489c-957b-25b366ed1211','poop',now()),
('1a98ce39-fcaa-489c-957b-25b366ed1212','fart',now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '1a98ce39-fcaa-489c-957b-25b366ed1211', true);
do $$
declare affected integer;
begin
  if (select count(*) from public.events) <> 1 then raise exception 'SELECT isolation failed'; end if;
  insert into public.events(user_id,type,occurred_at) values ('1a98ce39-fcaa-489c-957b-25b366ed1211','fart',now());
  begin
    insert into public.events(user_id,type,occurred_at) values ('1a98ce39-fcaa-489c-957b-25b366ed1212','poop',now());
    raise exception 'Cross-user INSERT was allowed';
  exception when insufficient_privilege then null;
  end;
  update public.events set type='poop' where user_id='1a98ce39-fcaa-489c-957b-25b366ed1212';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user UPDATE was allowed'; end if;
  begin
    update public.events set user_id='1a98ce39-fcaa-489c-957b-25b366ed1212' where user_id='1a98ce39-fcaa-489c-957b-25b366ed1211';
    raise exception 'Ownership reassignment was allowed';
  exception when insufficient_privilege then null;
  end;
  update public.events set type='fart' where user_id='1a98ce39-fcaa-489c-957b-25b366ed1211';
  get diagnostics affected = row_count;
  if affected <> 2 then raise exception 'Own UPDATE failed'; end if;
  delete from public.events where user_id='1a98ce39-fcaa-489c-957b-25b366ed1212';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user DELETE was allowed'; end if;
  delete from public.events where user_id='1a98ce39-fcaa-489c-957b-25b366ed1211';
  get diagnostics affected = row_count;
  if affected <> 2 then raise exception 'Own DELETE failed'; end if;
end $$;
reset role;
rollback;
select 'RLS isolation and own CRUD checks passed; fixtures rolled back' as result;
