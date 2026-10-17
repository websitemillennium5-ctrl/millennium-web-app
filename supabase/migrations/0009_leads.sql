-- Enquiries captured on the public site. The jobs page asks non-students (and anyone whose student ID didn't
-- match) for their details before handing over an application link. Rows are written by a Server Action with
-- the service-role key, so there is no public insert policy; only staff can read or manage them.

create table public.leads (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  phone              text not null,
  email              text,
  city               text,
  experience         text check (experience in ('none', 'airline', 'hospitality', 'other')),
  experience_details text,
  source             text not null default 'jobs page',
  listing_title      text,                 -- the job / event they wanted to apply to
  listing_url        text,
  student_id_tried   text,                 -- the ID they typed if they said they were a student but it didn't match
  created_at         timestamptz not null default now()
);

create index leads_created_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

create policy "staff read leads" on public.leads for select to authenticated using ((select public.is_staff()));
create policy "staff edit leads" on public.leads for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff delete leads" on public.leads for delete to authenticated using ((select public.is_staff()));
