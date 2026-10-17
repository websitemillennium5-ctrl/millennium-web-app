-- Millennium portals: student portal + admin/staff portal.
-- Run this once in Supabase → SQL Editor (or `supabase db push` if you use the CLI).

-- ───────────────────────── Roles & profiles ─────────────────────────

create type public.user_role as enum ('student', 'staff', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'student',
  full_name   text not null default '',
  email       text,
  phone       text,
  course_slug text,                       -- matches `courses[].slug` in src/lib/site.ts
  batch       text,
  roll_no     text unique,
  fee_total   numeric(10, 2) not null default 0,
  joined_on   date not null default current_date,
  created_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- Role lookups used by RLS. SECURITY DEFINER so they can read profiles without recursing into its own policies.
create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'));
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Every new auth user gets a profile. The role comes from app_metadata, which only the
-- service-role key can set, so nobody can sign themselves up as staff.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change someone's role (staff can edit student details but not promote anyone).
-- auth.uid() is null for the service role / SQL editor, which are allowed through.
create function public.guard_role_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_role_change();

alter table public.profiles enable row level security;

create policy "read own profile or staff reads all" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_staff()));

create policy "staff update profiles" on public.profiles
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "admins delete profiles" on public.profiles
  for delete to authenticated using ((select public.is_admin()));

-- ───────────────────────── Fees ─────────────────────────

create table public.fee_payments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  amount      numeric(10, 2) not null check (amount > 0),
  paid_on     date not null default current_date,
  method      text not null default 'cash',  -- cash | upi | card | bank | other
  note        text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index fee_payments_student_idx on public.fee_payments (student_id, paid_on desc);

alter table public.fee_payments enable row level security;

create policy "students read own payments, staff read all" on public.fee_payments
  for select to authenticated using (student_id = (select auth.uid()) or (select public.is_staff()));

create policy "staff record payments" on public.fee_payments
  for insert to authenticated with check ((select public.is_staff()));

create policy "staff delete payments" on public.fee_payments
  for delete to authenticated using ((select public.is_staff()));

-- ───────────────────────── Announcements ─────────────────────────

create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  course_slug text,                         -- null = everyone, otherwise only that course
  pinned      boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index announcements_created_idx on public.announcements (pinned desc, created_at desc);

alter table public.announcements enable row level security;

create policy "students read announcements for them, staff read all" on public.announcements
  for select to authenticated using (
    (select public.is_staff())
    or course_slug is null
    or course_slug = (select course_slug from public.profiles where id = (select auth.uid()))
  );

create policy "staff manage announcements" on public.announcements
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- ───────────────────────── Jobs (filled by the scraper) ─────────────────────────

create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  company     text not null,                -- airline / employer
  location    text,
  url         text not null unique,         -- scraper upserts on this
  source      text not null default 'manual',
  description text,
  posted_at   date,
  is_active   boolean not null default true,
  scraped_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index jobs_active_idx on public.jobs (is_active, posted_at desc nulls last);

alter table public.jobs enable row level security;

create policy "signed-in users read active jobs, staff read all" on public.jobs
  for select to authenticated using (is_active or (select public.is_staff()));

create policy "staff manage jobs" on public.jobs
  for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
