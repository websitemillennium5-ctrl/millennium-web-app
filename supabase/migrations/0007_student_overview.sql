-- Students with their fee totals rolled up, for the staff portal's student list (filter by fee status, sort, fee bar).
-- security_invoker: the caller's RLS applies, so only staff see every row and students only ever see their own.

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
