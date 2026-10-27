-- Security hardening from the October 2026 RLS review.

-- 1. Staff could update *any* profile through the API (name, email, fee… on admin accounts too; only the role
--    was guarded). Staff may now edit student profiles only; admins may edit anyone.
drop policy "staff update profiles" on public.profiles;

create policy "staff update students, admins update anyone" on public.profiles
  for update to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and role = 'student'))
  with check ((select public.is_admin()) or ((select public.is_staff()) and role = 'student'));

-- 2. SECURITY DEFINER functions were callable over the REST API (/rest/v1/rpc/…) by anyone.
--    The trigger functions are never meant to be called directly (triggers don't need EXECUTE to fire).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_role_change() from public, anon, authenticated;

--    The role checks stay callable by signed-in users, because RLS policies run them as the caller,
--    but signed-out visitors have no use for them.
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;
