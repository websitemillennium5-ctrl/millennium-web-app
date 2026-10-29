-- Published recruiter / HR / careers email addresses per employer (October 2026), collected once by hand from each
-- employer's own website and kept here; the scrapers never touch this table. One row per address, several per
-- employer allowed. `source` is the job-source key (jobs_<source>) or the event-only brand key (indigo, spicejet),
-- see src/lib/job-sources.ts. The student portal and mobile app turn these into a pre-filled "Email recruiter" draft.

create table public.recruiter_emails (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  email       text not null,
  label       text not null default '',   -- what the employer's site says the address is for
  found_on    text,                        -- page the address was published on
  note        text,                        -- caveats, e.g. "says it does not accept CVs"
  is_active   boolean not null default true, -- staff can switch an address off without deleting it
  created_at  timestamptz not null default now(),
  unique (source, email)
);

create index recruiter_emails_source_idx on public.recruiter_emails (source) where is_active;

alter table public.recruiter_emails enable row level security;

create policy "signed-in users read active recruiter emails, staff read all" on public.recruiter_emails
  for select to authenticated using (is_active or (select public.is_staff()));

create policy "staff manage recruiter emails" on public.recruiter_emails
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
