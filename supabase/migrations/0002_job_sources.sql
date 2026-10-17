-- One table per scraped airline, each filled by its own worker (scripts/scrapers/<source>.mjs),
-- plus an `all_jobs` view that merges them with the hand-added `jobs` table for the portal pages.
-- Keep the source list in sync with src/lib/job-sources.ts.

do $$
declare
  source text;
  tbl text;
begin
  foreach source in array array[
    'emirates', 'qatar_airways', 'etihad', 'lufthansa', 'flydubai', 'british_airways', 'air_arabia',
    'air_india', 'akasa', 'indigo_cabin_crew', 'indigo_ground_staff', 'spicejet', 'star_air', 'fly91'
  ] loop
    tbl := 'jobs_' || source;

    execute format($f$
      create table public.%1$I (
        id          uuid primary key default gen_random_uuid(),
        title       text not null,
        company     text not null,
        location    text,
        url         text not null unique,         -- the worker upserts on this
        description text,
        posted_at   date,
        is_active   boolean not null default true, -- staff hide/show; the worker never overwrites it
        scraped_at  timestamptz not null default now(),
        created_at  timestamptz not null default now()
      )$f$, tbl);

    execute format('create index %I on public.%I (is_active, posted_at desc nulls last)', tbl || '_active_idx', tbl);
    execute format('alter table public.%I enable row level security', tbl);

    execute format($f$
      create policy "signed-in users read active jobs, staff read all" on public.%I
        for select to authenticated using (is_active or (select public.is_staff()))$f$, tbl);

    execute format($f$
      create policy "staff manage jobs" on public.%I
        for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))$f$, tbl);
  end loop;
end;
$$;

-- security_invoker makes the view run with the caller's permissions, so each table's RLS still applies.
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
  union all select id, title, company, location, url, 'indigo_cabin_crew', description, posted_at, is_active, scraped_at from public.jobs_indigo_cabin_crew
  union all select id, title, company, location, url, 'indigo_ground_staff', description, posted_at, is_active, scraped_at from public.jobs_indigo_ground_staff
  union all select id, title, company, location, url, 'spicejet', description, posted_at, is_active, scraped_at from public.jobs_spicejet
  union all select id, title, company, location, url, 'star_air', description, posted_at, is_active, scraped_at from public.jobs_star_air
  union all select id, title, company, location, url, 'fly91', description, posted_at, is_active, scraped_at from public.jobs_fly91;

grant select on public.all_jobs to authenticated;
