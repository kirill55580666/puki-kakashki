-- Verify new JSON data constraints and ownership; all fixtures are rolled back.
begin;
insert into auth.users(id,aud,role,email) values
('3b98ce39-fcaa-489c-957b-25b366ed1211','authenticated','authenticated','symptom-a@example.invalid'),
('3b98ce39-fcaa-489c-957b-25b366ed1212','authenticated','authenticated','symptom-b@example.invalid');
insert into public.events(user_id,type,occurred_at,symptoms) values
('3b98ce39-fcaa-489c-957b-25b366ed1211','poop',now(),'{"pain":0,"blood":false,"straining":true}'),
('3b98ce39-fcaa-489c-957b-25b366ed1212','poop',now(),'{"pain":2}');
set local role authenticated;
select set_config('request.jwt.claim.sub','3b98ce39-fcaa-489c-957b-25b366ed1211',true);
do $$
declare affected integer;
begin
  if (select count(*) from public.events) <> 1 then raise exception 'Symptoms SELECT isolation failed'; end if;
  if not exists(select 1 from public.events where symptoms->>'pain'='0' and symptoms->>'blood'='false') then raise exception 'Explicit negatives not preserved'; end if;
  update public.events set symptoms='{"pain":3}' where user_id='3b98ce39-fcaa-489c-957b-25b366ed1212';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user symptoms UPDATE allowed'; end if;
  begin
    insert into public.events(user_id,type,occurred_at,symptoms) values ('3b98ce39-fcaa-489c-957b-25b366ed1211','poop',now(),'{"pain":4}');
    raise exception 'Invalid pain allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.events(user_id,type,occurred_at,symptoms) values ('3b98ce39-fcaa-489c-957b-25b366ed1211','poop',now(),'{"blood":"yes"}');
    raise exception 'Invalid boolean allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.events(user_id,type,occurred_at,symptoms) values ('3b98ce39-fcaa-489c-957b-25b366ed1211','fart',now(),'{"blood":true}');
    raise exception 'Stool-only symptom on fart allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.events(user_id,type,occurred_at,symptoms) values ('3b98ce39-fcaa-489c-957b-25b366ed1211','poop',now(),'[]');
    raise exception 'Array symptoms allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.events(user_id,type,occurred_at,symptoms) values ('3b98ce39-fcaa-489c-957b-25b366ed1211','poop',now(),'{"unrelated":true}');
    raise exception 'Unknown symptom allowed';
  exception when check_violation then null;
  end;
  insert into public.events(user_id,type,occurred_at,symptoms) values ('3b98ce39-fcaa-489c-957b-25b366ed1211','fart',now(),'{"pain":1,"bloating":true}');
  update public.events set symptoms=null;
  if exists(select 1 from public.events where symptoms is not null) then raise exception 'Clear symptoms failed'; end if;
end $$;
reset role;
rollback;
select 'Symptoms constraints and RLS passed; fixtures rolled back' as result;
