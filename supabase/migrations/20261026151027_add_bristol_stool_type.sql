-- Additive change: existing events remain unclassified and older clients still work.
alter table public.events
  add column bristol_type smallint;

alter table public.events
  add constraint events_bristol_type_check
  check (
    bristol_type is null
    or (type = 'poop' and bristol_type between 1 and 7)
  );

comment on column public.events.bristol_type is
  'Optional Bristol stool form type, 1–7 for poop events; null means unspecified.';
