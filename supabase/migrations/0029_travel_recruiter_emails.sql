-- Recruiter email addresses of the travel & tourism employers, collected from each employer's own website on
-- 2026-11-03 (see 0016 for the table). Keys are the job-source keys from 0028 or, for employers whose sites only offer a
-- "send your CV" form and have no job list to scrape (Thomas Cook, SOTC, Kesari, Akbar Travels, Club Mahindra, Cordelia,
-- TUI), the brand keys from src/lib/airlines.ts, so hand-added jobs for them still get the "Email recruiter" draft.
-- Employers with nothing published on their own site: MakeMyTrip, Expedia Group, Agoda, Sterling Holiday Resorts.

insert into public.recruiter_emails (source, email, label, found_on, note, is_active) values
  ('veena_world', 'careers@veenaworld.com', 'Careers – send your resume', 'https://www.veenaworld.com/careers', 'The careers page says "Please share your resume with us at careers@veenaworld.com"; openings are also applied for online.', true),
  ('easemytrip', 'joinus@easemytrip.com', 'Careers / HR – roles not listed', 'https://www.easemytrip.com/career.html', 'Published under "Could not find a work role for yourself? … Email us" and in the Get in touch section of the careers page.', true),
  ('ixigo', 'careers@ixigo.com', 'Careers – apply for another position', 'https://careers.ixigo.com/', 'The address behind the "Apply for Another Position" button under the openings list.', true),
  ('thrillophilia', 'support@thrillophilia.com', 'Customer support (general contact)', 'https://www.thrillophilia.com/contact-us', 'Only address Thrillophilia publishes; no careers inbox (jobs are applied for online).', true),
  ('booking', 'reasonableaccommodation@bookingholdings.com', 'Disability accommodation requests (applications only)', 'https://jobs.booking.com/booking/jobs/30370', 'Shown on every job page, only for applicants who need an accommodation to apply; not a recruiting inbox, kept off.', false),
  ('thomas_cook', 'enquiry@thomascook.in', 'Head office general enquiries', 'https://www.thomascook.in/contact-us', 'Thomas Cook India publishes no careers address; its careers page (thomascook.in/mycareer/career) only has a Submit Your CV form.', true),
  ('sotc', 'hr.careers@sotc.in', 'Careers – HR', 'https://www.sotc.in/', 'The Careers link in the site footer is a mailto to this address; the careers page itself only has a Submit Your CV form.', true),
  ('sotc', 'customercare@sotc.in', 'Customer service', 'https://www.sotc.in/', 'General customer inbox, not careers; kept off because hr.careers@sotc.in exists.', false),
  ('kesari', 'hr@kesari.in', 'Jobs in Kesari', 'https://www.kesari.in/contact', 'Listed as "For Jobs in Kesari" on the contact page; the careers page is an application form with no openings list.', true),
  ('akbar_travels', 'hr@akbartravels.com', 'Careers – email your resume', 'https://www.akbartravels.com/in/careers', 'The careers page asks for the resume by email with the job designation in the subject line.', true),
  ('club_mahindra', 'Careers@mahindraholidays.com', 'Careers – send us your profile', 'https://www.clubmahindra.com/careers', 'Mahindra Holidays (Club Mahindra); the careers page lists no openings.', true),
  ('cordelia', 'info@cordeliacruises.com', 'Customer support (general contact)', 'https://www.cordeliacruises.com/', 'Only general address Cordelia publishes; the careers pages have a "join our talent community" resume form and no openings.', true),
  ('tui', 'destination.careers@tui.com', 'Holiday destination jobs recruitment team', 'https://careers.tuigroup.com/en/contact', 'European recruitment team (TUI has no India desk or India openings); applications must be submitted online.', true),
  ('tui', 'hotel.careers@tui.com', 'Hotels & Resorts recruitment team', 'https://careers.tuigroup.com/en/contact', 'European recruitment team (TUI has no India desk or India openings); applications must be submitted online.', true)
on conflict (source, email) do update set label = excluded.label, found_on = excluded.found_on, note = excluded.note, is_active = excluded.is_active;
