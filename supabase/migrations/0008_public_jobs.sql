-- The public /airline-jobs page reads jobs and hiring events without signing in, so signed-out visitors (anon)
-- can read active listings. Hidden ones stay staff-only.

do $$
declare
  tbl text;
begin
  for tbl in
    select tablename from pg_tables where schemaname = 'public' and (tablename = 'jobs' or tablename like 'jobs\_%' or tablename like 'events\_%')
  loop
    execute format('create policy "public reads active listings" on public.%I for select to anon using (is_active)', tbl);
  end loop;
end;
$$;

grant select on public.all_jobs, public.all_hiring_events to anon;

-- Event tables added by later migrations get the same public read policy.
create or replace function public.create_event_table(source text) returns void
language plpgsql set search_path = '' as $$
declare
  tbl text := 'events_' || source;
begin
  execute format($f$
    create table public.%1$I (
      id          uuid primary key default gen_random_uuid(),
      brand       text not null,                 -- airline name shown on the card
      title       text not null,
      url         text not null unique,          -- the worker upserts on this
      event_type  public.hiring_event_type not null default 'other',
      role        text,
      city        text,
      country     text,
      venue       text,
      event_date  date,                          -- null = online drive with no fixed date
      event_time  text,
      apply_url   text,
      description text,
      is_active   boolean not null default true, -- staff hide/show; the worker never overwrites it
      scraped_at  timestamptz not null default now(),
      created_at  timestamptz not null default now()
    )$f$, tbl);
  execute format('create index %I on public.%I (event_date)', tbl || '_date_idx', tbl);
  execute format('alter table public.%I enable row level security', tbl);
  execute format($f$create policy "signed-in users read active events, staff read all" on public.%I
    for select to authenticated using (is_active or (select public.is_staff()))$f$, tbl);
  execute format('create policy "public reads active listings" on public.%I for select to anon using (is_active)', tbl);
  execute format($f$create policy "staff edit events" on public.%I
    for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))$f$, tbl);
  execute format($f$create policy "staff delete events" on public.%I
    for delete to authenticated using ((select public.is_staff()))$f$, tbl);
end;
$$;

revoke execute on function public.create_event_table(text) from public, anon, authenticated;
