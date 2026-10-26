alter table public.events add column symptoms jsonb;

alter table public.events add constraint events_symptoms_check check (
  symptoms is null or (
    jsonb_typeof(symptoms) = 'object'
    and (symptoms - array['pain','bloating','straining','incomplete','blood','laxative']::text[]) = '{}'::jsonb
    and (not (symptoms ? 'pain') or symptoms->'pain' = 'null'::jsonb or (jsonb_typeof(symptoms->'pain') = 'number' and symptoms->>'pain' in ('0','1','2','3')))
    and (not (symptoms ? 'bloating') or symptoms->'bloating' = 'null'::jsonb or jsonb_typeof(symptoms->'bloating') = 'boolean')
    and (not (symptoms ? 'straining') or symptoms->'straining' = 'null'::jsonb or (type = 'poop' and jsonb_typeof(symptoms->'straining') = 'boolean'))
    and (not (symptoms ? 'incomplete') or symptoms->'incomplete' = 'null'::jsonb or (type = 'poop' and jsonb_typeof(symptoms->'incomplete') = 'boolean'))
    and (not (symptoms ? 'blood') or symptoms->'blood' = 'null'::jsonb or (type = 'poop' and jsonb_typeof(symptoms->'blood') = 'boolean'))
    and (not (symptoms ? 'laxative') or symptoms->'laxative' = 'null'::jsonb or (type = 'poop' and jsonb_typeof(symptoms->'laxative') = 'boolean'))
  )
);
comment on column public.events.symptoms is 'Optional self-reported symptoms. Missing values are unknown, not negative. No diagnosis.';
