-- Recruiter email addresses of the second-wave travel & tourism employers, collected from each employer's own website on
-- 2026-11-03 (see 0016 for the table, 0029 for the first wave). Brand-only keys (tripoto, bls_international,
-- travel_food_services) belong to employers with no job list to scrape; src/lib/airlines.ts maps their names to the key.
-- Employers with nothing published on their own site: Amadeus, Sabre, Airbnb, Navan, Amex GBT, TripJack, Zostel.

insert into public.recruiter_emails (source, email, label, found_on, note, is_active) values
  ('pickyourtrail', 'careers@pickyourtrail.com', 'Careers – contact us', 'https://pickyourtrail.com/careers', 'Careers address in the footer of the careers page; openings are also applied for online.', true),
  ('travel_triangle', 'hr@traveltriangle.com', 'HR – share your resume', 'https://traveltriangle.com/career/77', 'Every role page says "How to apply: Share your resume to hr@traveltriangle.com".', true),
  ('savaari', 'jobs@savaari.com', 'Careers – send your resume', 'https://www.savaari.com/careers', 'The careers page asks for resumes at this address "and tell us why you are unique".', true),
  ('bcd_travel', 'careers@bcdtravel.com', 'Talent Acquisition – application assistance', 'https://jobs.bcdtravel.com/', 'Published for accessibility and accommodation requests and help completing an application; applications are made online.', true),
  ('headout', 'support@headout.com', 'Customer support (general contact)', 'https://www.headout.com/careers/', 'Only address Headout publishes; no careers inbox (jobs are applied for online).', true),
  ('tripoto', 'careers@tripoto.com', 'Careers – apply by email', 'https://www.tripoto.com/careers', 'The careers page says "To apply for a position with us write to us at careers@tripoto.com"; no openings are listed.', true),
  ('bls_international', 'hr@blsinternational.com', 'HR related queries', 'https://www.blsinternational.com/contact-us', 'BLS International (visa application centres); its Current Openings page lists nothing.', true),
  ('travel_food_services', 'info@travelfoodservices.com', 'Corporate office general enquiries', 'https://www.travelfoodservices.com/contact-us', 'Travel Food Services (airport food courts and lounges) publishes no careers address; its careers page only has a CV-upload form.', true)
on conflict (source, email) do update set label = excluded.label, found_on = excluded.found_on, note = excluded.note, is_active = excluded.is_active;
