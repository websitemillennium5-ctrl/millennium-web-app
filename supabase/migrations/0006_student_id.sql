-- Institute-issued student ID, separate from the roll number used for sign-in.

alter table public.profiles add column student_id text unique;
