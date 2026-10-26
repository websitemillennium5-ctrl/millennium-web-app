-- Listing syncs requested from the staff portal (Jobs → Sync) and run by the local worker
-- (scripts/scrapers/worker.mjs on an office machine; IndiGo and Fly91 block GitHub's datacenter IPs).
-- Staff queue and cancel runs; the worker claims, runs and reports them with the service-role key.

create table public.sync_runs (
  id           uuid primary key default gen_random_uuid(),
  sources      text[],                                     -- scraper names ("emirates", "events/etihad"); null = all
  status       text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  trigger      text not null default 'panel' check (trigger in ('panel', 'schedule')),
  requested_by uuid references public.profiles (id) on delete set null,
  worker       text,                                       -- hostname of the machine that ran it
  results      jsonb not null default '[]',                -- [{ name, ok, found, removed, seconds, error }] as each source finishes
  log          text not null default '',
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);

create index sync_runs_created_idx on public.sync_runs (created_at desc);
create index sync_runs_queued_idx on public.sync_runs (created_at) where status = 'queued';

-- One row per worker machine, refreshed every few seconds so the panel can show whether it's online.
create table public.sync_workers (
  id         text primary key,                             -- hostname
  last_seen  timestamptz not null default now(),
  started_at timestamptz not null default now(),
  run_id     uuid references public.sync_runs (id) on delete set null
);

alter table public.sync_runs enable row level security;
alter table public.sync_workers enable row level security;

create policy "staff read sync runs" on public.sync_runs for select to authenticated using ((select public.is_staff()));
create policy "staff queue sync runs" on public.sync_runs for insert to authenticated
  with check ((select public.is_staff()) and status = 'queued' and trigger = 'panel');
create policy "staff cancel sync runs" on public.sync_runs for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()) and status = 'cancelled');
create policy "staff read sync workers" on public.sync_workers for select to authenticated using ((select public.is_staff()));
