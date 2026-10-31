-- Apply supabase/wexner-schema.sql first. All test users and records are rolled back.
begin;
insert into auth.users(id, aud, role, email) values
('2a98ce39-fcaa-489c-957b-25b366ed1211','authenticated','authenticated','wexner-a@example.invalid'),
('2a98ce39-fcaa-489c-957b-25b366ed1212','authenticated','authenticated','wexner-b@example.invalid');
insert into public.wexner_assessments(user_id,version,assessed_at,answers) values
('2a98ce39-fcaa-489c-957b-25b366ed1211','wexner-1996-ru-v1',now(),'{4,4,4,4,4,2,4,4}'),
('2a98ce39-fcaa-489c-957b-25b366ed1212','wexner-1996-ru-v1',now(),'{0,0,0,0,0,0,0,0}');
set local role authenticated;
select set_config('request.jwt.claim.sub','2a98ce39-fcaa-489c-957b-25b366ed1211',true);
do $$
declare candidate smallint[];
begin
  if (select count(*) from public.wexner_assessments) <> 1 then raise exception 'Wexner SELECT isolation failed'; end if;
  insert into public.wexner_assessments(user_id,version,assessed_at,answers)
    values ('2a98ce39-fcaa-489c-957b-25b366ed1211','wexner-1996-ru-v1',now(),'{0,0,0,0,0,0,0,0}');
  begin
    insert into public.wexner_assessments(user_id,version,assessed_at,answers)
      values ('2a98ce39-fcaa-489c-957b-25b366ed1212','wexner-1996-ru-v1',now(),'{0,0,0,0,0,0,0,0}');
    raise exception 'Wexner cross-user INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  foreach candidate slice 1 in array array[
    array[4,4,4,4,4,3,4,4]::smallint[],
    array[0,0,0,0,0,0,0,null]::smallint[],
    array[0,0,0,0,0,0,0,-1]::smallint[]
  ] loop
    begin
      insert into public.wexner_assessments(user_id,version,assessed_at,answers)
        values ('2a98ce39-fcaa-489c-957b-25b366ed1211','wexner-1996-ru-v1',now(),candidate);
      raise exception 'Invalid Wexner answers allowed';
    exception when check_violation then null;
    end;
  end loop;
  begin
    insert into public.wexner_assessments(user_id,version,assessed_at,answers)
      values ('2a98ce39-fcaa-489c-957b-25b366ed1211','wexner-1996-ru-v1',now(),'{0}');
    raise exception 'Incomplete Wexner answers allowed';
  exception when check_violation then null;
  end;
  begin
    update public.wexner_assessments set user_id = '2a98ce39-fcaa-489c-957b-25b366ed1212';
    raise exception 'Immutable Wexner assessment could be updated';
  exception when insufficient_privilege then null;
  end;
  insert into public.events(user_id,type,occurred_at,attempt_duration_minutes) values
    ('2a98ce39-fcaa-489c-957b-25b366ed1211','poop',now(),1),
    ('2a98ce39-fcaa-489c-957b-25b366ed1211','fart',now(),1440),
    ('2a98ce39-fcaa-489c-957b-25b366ed1211','fart',now(),null);
  begin
    insert into public.events(user_id,type,occurred_at,attempt_duration_minutes)
      values ('2a98ce39-fcaa-489c-957b-25b366ed1211','fart',now(),0);
    raise exception 'Zero duration allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.events(user_id,type,occurred_at,attempt_duration_minutes)
      values ('2a98ce39-fcaa-489c-957b-25b366ed1211','fart',now(),1441);
    raise exception 'Excessive duration allowed';
  exception when check_violation then null;
  end;
end $$;
reset role;
do $$ begin
  if has_table_privilege('anon','public.wexner_assessments','select')
    or has_table_privilege('anon','public.wexner_assessments','insert') then
    raise exception 'Anonymous access allowed';
  end if;
end $$;
rollback;
select 'Wexner constraints, duration bounds, RLS isolation and grants passed; all fixtures rolled back' as result;
