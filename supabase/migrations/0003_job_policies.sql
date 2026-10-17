-- "staff manage jobs" was FOR ALL, which also covers SELECT and overlaps the read policy, so Postgres
-- evaluated both on every read (Supabase lint 0006). Split it into insert/update/delete only.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'jobs', 'jobs_emirates', 'jobs_qatar_airways', 'jobs_etihad', 'jobs_lufthansa', 'jobs_flydubai',
    'jobs_british_airways', 'jobs_air_arabia', 'jobs_air_india', 'jobs_akasa', 'jobs_indigo_cabin_crew',
    'jobs_indigo_ground_staff', 'jobs_spicejet', 'jobs_star_air', 'jobs_fly91'
  ] loop
    execute format('drop policy "staff manage jobs" on public.%I', tbl);
    execute format('create policy "staff add jobs" on public.%I for insert to authenticated with check ((select public.is_staff()))', tbl);
    execute format('create policy "staff edit jobs" on public.%I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', tbl);
    execute format('create policy "staff delete jobs" on public.%I for delete to authenticated using ((select public.is_staff()))', tbl);
  end loop;
end;
$$;
