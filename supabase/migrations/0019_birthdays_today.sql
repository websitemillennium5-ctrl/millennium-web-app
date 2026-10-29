-- Students whose birthday is today (India time), for the birthday banner and the "Birthdays today" list in the
-- student portal and mobile app. Students can only read their own profile row (0001), so this SECURITY DEFINER
-- function hands out just the few public fields needed to wish a classmate.
create or replace function public.birthdays_today()
returns table (id uuid, full_name text, course_slug text, batch text, student_id text)
language sql stable security definer set search_path = '' as $$
  with today as (
    select (now() at time zone 'Asia/Kolkata')::date as d
  )
  select p.id, p.full_name, p.course_slug, p.batch, p.student_id
  from public.profiles p, today
  where p.role = 'student'
    and p.date_of_birth is not null
    and (
      to_char(p.date_of_birth, 'MM-DD') = to_char(today.d, 'MM-DD')
      -- leap-day birthdays are celebrated on 28 Feb in other years
      or (to_char(p.date_of_birth, 'MM-DD') = '02-29' and to_char(today.d, 'MM-DD') = '02-28'
          and extract(day from (date_trunc('year', today.d) + interval '2 month - 1 day')) = 28)
    )
  order by p.full_name;
$$;

revoke execute on function public.birthdays_today() from public, anon;
grant execute on function public.birthdays_today() to authenticated;
