-- Hiring events (walk-ins, open days, interview drives) get their own tables, one per source, each filled by
-- scripts/scrapers/events/<source>.mjs, and an `all_hiring_events` view for the Hiring events page.
-- IndiGo and SpiceJet only ever posted events, so their job tables are replaced by event tables.
-- Keep the source list in sync with `eventSources` in src/lib/job-sources.ts.

drop view public.all_jobs;
drop table public.jobs_indigo_cabin_crew, public.jobs_indigo_ground_staff, public.jobs_spicejet;

create view public.all_jobs with (security_invoker = true) as
  select id, title, company, location, url, source, description, posted_at, is_active, scraped_at from public.jobs
  union all select id, title, company, location, url, 'emirates', description, posted_at, is_active, scraped_at from public.jobs_emirates
  union all select id, title, company, location, url, 'qatar_airways', description, posted_at, is_active, scraped_at from public.jobs_qatar_airways
  union all select id, title, company, location, url, 'etihad', description, posted_at, is_active, scraped_at from public.jobs_etihad
  union all select id, title, company, location, url, 'lufthansa', description, posted_at, is_active, scraped_at from public.jobs_lufthansa
  union all select id, title, company, location, url, 'flydubai', description, posted_at, is_active, scraped_at from public.jobs_flydubai
  union all select id, title, company, location, url, 'british_airways', description, posted_at, is_active, scraped_at from public.jobs_british_airways
  union all select id, title, company, location, url, 'air_arabia', description, posted_at, is_active, scraped_at from public.jobs_air_arabia
  union all select id, title, company, location, url, 'air_india', description, posted_at, is_active, scraped_at from public.jobs_air_india
  union all select id, title, company, location, url, 'akasa', description, posted_at, is_active, scraped_at from public.jobs_akasa
  union all select id, title, company, location, url, 'star_air', description, posted_at, is_active, scraped_at from public.jobs_star_air
  union all select id, title, company, location, url, 'fly91', description, posted_at, is_active, scraped_at from public.jobs_fly91;

grant select on public.all_jobs to authenticated;

create type public.hiring_event_type as enum ('walk_in', 'open_day', 'interview', 'online_drive', 'other');

-- Creates one source's event table with its index and RLS. Later migrations call this for new airlines.
create function public.create_event_table(source text) returns void
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
  execute format($f$create policy "staff edit events" on public.%I
    for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))$f$, tbl);
  execute format($f$create policy "staff delete events" on public.%I
    for delete to authenticated using ((select public.is_staff()))$f$, tbl);
end;
$$;

revoke execute on function public.create_event_table(text) from public, anon, authenticated;

select public.create_event_table(s) from unnest(array['indigo_cabin_crew', 'indigo_ground_staff', 'spicejet']) s;

-- Past events are hidden here (by the Indian date) as well as pruned by the workers.
create view public.all_hiring_events with (security_invoker = true) as
  select * from (
    select id, 'indigo_cabin_crew' as source, brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_indigo_cabin_crew
    union all select id, 'indigo_ground_staff', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_indigo_ground_staff
    union all select id, 'spicejet', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_spicejet
  ) e
  where event_date is null or event_date >= (now() at time zone 'Asia/Kolkata')::date;

grant select on public.all_hiring_events to authenticated;
