-- Study material staff share with students: an uploaded file (kept in the private `study-materials`
-- storage bucket) and/or a link, for one batch or for every student.
-- Files are only ever reached through short-lived signed URLs made on the server after the row check below,
-- so the bucket needs no storage policies of its own.

create table public.study_materials (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  batch       text,                         -- null = all students, otherwise only that batch (matches profiles.batch)
  file_path   text,                         -- object path in the study-materials bucket
  file_name   text,
  file_size   bigint,
  mime_type   text,
  link_url    text,                         -- e.g. a YouTube or Google Drive link
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint study_materials_has_content check (file_path is not null or link_url is not null)
);

create index study_materials_created_idx on public.study_materials (created_at desc);

alter table public.study_materials enable row level security;

create policy "students read material for their batch, staff read all" on public.study_materials
  for select to authenticated using (
    (select public.is_staff())
    or batch is null
    or lower(batch) = (select lower(batch) from public.profiles where id = (select auth.uid()))
  );

create policy "staff manage study material" on public.study_materials
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

insert into storage.buckets (id, name, public, file_size_limit)
values ('study-materials', 'study-materials', false, 52428800) -- 50 MB per file
on conflict (id) do nothing;
