-- Apply once in the Supabase SQL Editor.
begin;
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('poop', 'fart')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index events_user_occurred_idx on public.events(user_id, occurred_at desc);
alter table public.events enable row level security;
revoke all on public.events from anon;
grant select, insert, update, delete on public.events to authenticated;
create policy "Read own events" on public.events for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own events" on public.events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own events" on public.events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own events" on public.events for delete to authenticated using ((select auth.uid()) = user_id);
commit;
