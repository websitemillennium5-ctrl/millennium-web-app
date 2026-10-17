-- Hiring-event tables for the other airlines that publish open days, walk-ins or recruitment drives.
-- (Lufthansa, British Airways, Star Air and Fly91 don't publish hiring events, so they have no event table.)

select public.create_event_table(s) from unnest(array['emirates', 'qatar_airways', 'etihad', 'air_arabia', 'flydubai', 'air_india', 'akasa']) s;

create or replace view public.all_hiring_events with (security_invoker = true) as
  select * from (
    select id, 'indigo_cabin_crew' as source, brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_indigo_cabin_crew
    union all select id, 'indigo_ground_staff', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_indigo_ground_staff
    union all select id, 'spicejet', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_spicejet
    union all select id, 'emirates', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_emirates
    union all select id, 'qatar_airways', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_qatar_airways
    union all select id, 'etihad', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_etihad
    union all select id, 'air_arabia', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_air_arabia
    union all select id, 'flydubai', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_flydubai
    union all select id, 'air_india', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_air_india
    union all select id, 'akasa', brand, title, url, event_type, role, city, country, venue, event_date, event_time, apply_url, description, is_active, scraped_at from public.events_akasa
  ) e
  where event_date is null or event_date >= (now() at time zone 'Asia/Kolkata')::date;
