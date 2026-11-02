-- Audit trail for the staff portal: who changed what on which student, and when. Written by the Server Actions
-- that edit students (details, payments, password resets, create/delete) with the signed-in staff member's
-- session, so RLS lets staff insert; rows are never updated or deleted from the app. The student's name is
-- copied in so the trail survives the student being deleted.

create table public.student_changes (
  id            bigint generated always as identity primary key,
  student_id    uuid references public.profiles (id) on delete set null,
  student_name  text not null,
  staff_id      uuid references public.profiles (id) on delete set null,
  staff_name    text not null,
  action        text not null check (action in ('created', 'updated', 'payment_added', 'payment_deleted', 'password_reset', 'deleted')),
  changes       jsonb not null default '[]'::jsonb,   -- [{ field, from, to }] for updates; details for the rest
  created_at    timestamptz not null default now()
);

create index student_changes_student_idx on public.student_changes (student_id, id desc);
create index student_changes_recent_idx on public.student_changes (id desc);

alter table public.student_changes enable row level security;

create policy "staff read student changes" on public.student_changes for select to authenticated using ((select public.is_staff()));
create policy "staff log student changes" on public.student_changes for insert to authenticated with check ((select public.is_staff()));
