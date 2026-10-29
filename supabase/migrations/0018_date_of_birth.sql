-- Student's date of birth, entered by staff when adding or editing a student and shown on the student's profile.

alter table public.profiles add column date_of_birth date;

-- student_overview was created with `p.*`, which is expanded when the view is created, so it has to be rebuilt
-- to pick up the new column (same definition as 0007_student_overview.sql).
drop view public.student_overview;
create view public.student_overview with (security_invoker = true) as
select
  p.*,
  coalesce(f.paid, 0)::numeric(10, 2) as paid,
  greatest(p.fee_total - coalesce(f.paid, 0), 0)::numeric(10, 2) as due,
  f.last_paid_on
from public.profiles p
left join (
  select student_id, sum(amount) as paid, max(paid_on) as last_paid_on
  from public.fee_payments
  group by student_id
) f on f.student_id = p.id
where p.role = 'student';
