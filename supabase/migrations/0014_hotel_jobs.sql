-- Hotel-group job sources (October 2026): one table per scraped site, filled by scripts/scrapers/<source>.mjs, plus
-- the all_jobs view rebuilt to include them. Same shape and policies as the airline tables from 0002/0003/0008.
-- Keep the source list in sync with `jobSources` in src/lib/job-sources.ts (web and mobile app).

do $$
declare
  source text;
  tbl text;
begin
  foreach source in array array[
    'marriott', 'radisson', 'accor', 'hilton', 'hyatt', 'ihcl', 'lemon_tree', 'itc', 'fortune', 'wyndham', 'nile'
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

    execute format($f$create policy "signed-in users read active jobs, staff read all" on public.%I
      for select to authenticated using (is_active or (select public.is_staff()))$f$, tbl);
    execute format('create policy "public reads active listings" on public.%I for select to anon using (is_active)', tbl);
    execute format('create policy "staff add jobs" on public.%I for insert to authenticated with check ((select public.is_staff()))', tbl);
    execute format('create policy "staff edit jobs" on public.%I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', tbl);
    execute format('create policy "staff delete jobs" on public.%I for delete to authenticated using ((select public.is_staff()))', tbl);
  end loop;
end;
$$;

create or replace view public.all_jobs with (security_invoker = true) as
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
  union all select id, title, company, location, url, 'fly91', description, posted_at, is_active, scraped_at from public.jobs_fly91
  union all select id, title, company, location, url, 'marriott', description, posted_at, is_active, scraped_at from public.jobs_marriott
  union all select id, title, company, location, url, 'radisson', description, posted_at, is_active, scraped_at from public.jobs_radisson
  union all select id, title, company, location, url, 'accor', description, posted_at, is_active, scraped_at from public.jobs_accor
  union all select id, title, company, location, url, 'hilton', description, posted_at, is_active, scraped_at from public.jobs_hilton
  union all select id, title, company, location, url, 'hyatt', description, posted_at, is_active, scraped_at from public.jobs_hyatt
  union all select id, title, company, location, url, 'ihcl', description, posted_at, is_active, scraped_at from public.jobs_ihcl
  union all select id, title, company, location, url, 'lemon_tree', description, posted_at, is_active, scraped_at from public.jobs_lemon_tree
  union all select id, title, company, location, url, 'itc', description, posted_at, is_active, scraped_at from public.jobs_itc
  union all select id, title, company, location, url, 'fortune', description, posted_at, is_active, scraped_at from public.jobs_fortune
  union all select id, title, company, location, url, 'wyndham', description, posted_at, is_active, scraped_at from public.jobs_wyndham
  union all select id, title, company, location, url, 'nile', description, posted_at, is_active, scraped_at from public.jobs_nile;

grant select on public.all_jobs to authenticated, anon;
