-- Apply once before deploying the PR. Additive schema update; existing events stay unchanged.
begin;
alter table public.events add column attempt_duration_minutes integer
  check (attempt_duration_minutes between 1 and 1440);
comment on column public.events.attempt_duration_minutes is
  'Self-reported minutes per successful or unsuccessful attempt. NULL means unknown; not a Wexner score.';

create table public.wexner_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null check (version = 'wexner-1996-ru-v1'),
  assessed_at timestamptz not null,
  answers smallint[] not null,
  created_at timestamptz not null default now(),
  constraint wexner_answers_valid check (
    array_ndims(answers) = 1 and array_lower(answers, 1) = 1
    and cardinality(answers) = 8
    and array_position(answers, null) is null
    and 0 <= all(answers) and 4 >= all(answers)
    and answers[6] <= 2
  )
);
create index wexner_user_assessed_idx on public.wexner_assessments(user_id, assessed_at desc, id);
alter table public.wexner_assessments enable row level security;
revoke all on public.wexner_assessments from public, anon, authenticated;
grant select, insert on public.wexner_assessments to authenticated;
create policy "Read own Wexner assessments" on public.wexner_assessments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own Wexner assessments" on public.wexner_assessments
  for insert to authenticated with check ((select auth.uid()) = user_id);
comment on table public.wexner_assessments is
  'Complete manual Wexner self-assessments. Versioned answers, no diagnostic thresholds or automatic diary-to-score mapping.';
commit;
