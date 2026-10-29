-- Recruiter email addresses collected from each employer's own website on 2026-10-30 (see 0016 for the table).
-- Rows with is_active = false are kept for staff reference but never offered to students (pilot-only, rehire-only,
-- portal-helpdesk and duplicate customer-service inboxes). Employers with nothing published on their own site:
-- Air India, Qatar Airways, Etihad, British Airways, Air Arabia, Marriott, Accor, Hilton, Hyatt, Wyndham, Lemon Tree.

insert into public.recruiter_emails (source, email, label, found_on, note, is_active) values
  ('spicejet', 'careers@spicejet.com', 'Employment and recruitment queries, HR', 'https://corporate.spicejet.com/Careers.aspx', 'SpiceJet''s careers page asks the public to use this address for any information on employment or recruitment.', true),
  ('spicejet', 'contact@spicestaracademy.edu.in', 'Cabin crew walk-in registration help', 'https://corporate.spicejet.com/Careers.aspx', 'Spice Star Academy (SpiceJet''s cabin crew training academy, Gurugram); walk-in candidates register at application.spicestaracademy.edu.in.', true),
  ('spicejet', 'custrelations@spicejet.com', 'Customer relations', 'https://corporate.spicejet.com/contactus.aspx', 'General customer inbox, not careers; kept off because careers@spicejet.com exists.', false),
  ('akasa', 'info@akasaair.com', 'Corporate office general email', 'https://www.akasaair.com/customer-support/contact-us', 'General inbox; Akasa publishes no careers address (jobs are applied for online).', true),
  ('star_air', 'customercare@starair.in', 'Customer care (general contact)', 'https://www.starair.in/contact-us', 'Only contact address Star Air publishes; no HR or careers inbox on starair.in.', true),
  ('fly91', 'support@fly91.in', 'Customer support (general contact)', 'https://fly91.in/contact-us', 'Only contact address Fly91 publishes; the careers page has an upload-resume form instead.', true),
  ('indigo', 'hiring.support@goindigo.in', 'Rehire applications (ex-IndiGo staff only)', 'https://www.goindigo.in/careers/departments/inflightservices.html', 'IndiGo says this inbox is only for former IndiGo / InterGlobe employees and ignores other emails; kept off for students.', false),
  ('flydubai', 'recruitment@flydubai.com', 'flydubai Recruitment team', 'https://careers.flydubai.com/faqs', 'Published as the Recruitment team''s address (the site uses it to verify suspicious job offers); applications are normally made online.', true),
  ('flydubai', 'letstalk@flydubai.com', 'Customer service', 'https://news.flydubai.com/travel-advisory-adverse-weather-in-the-uae', 'General customer-care inbox, not recruitment; kept off because recruitment@flydubai.com exists.', false),
  ('lufthansa', 'recruiting@lat.dlh.de', 'HR / recruiting, Lufthansa Aviation Training', 'https://www.lufthansa-aviation-training.com/en/career', 'Human Resources team of Lufthansa Aviation Training GmbH (a Lufthansa Group company), not the whole group.', true),
  ('lufthansa', 'ejobhelpdesk@gbs.dlh.de', 'Application portal technical support', 'https://apply.lufthansagroup.careers/index.php?ac=help&subac=contact&nologin=true', 'Only for problems with a candidate account on the Lufthansa Group application portal, not for CVs; kept off.', false),
  ('emirates', 'pilotrecdxb@emirates.com', 'Pilot Recruitment team', 'https://www.emiratesgroupcareers.com/pilots/', 'Pilots only (to defer an assessment); cabin crew and ground roles have no published address; kept off.', false),
  ('radisson', 'hr1@radissonmbd.com', 'HR, Radisson Blu MBD Hotel Noida', 'https://radissoncareers.com/job/assistant-manager-manager-recruitment-in-noida-india-jid-34514', 'Property-level HR inbox published in Radisson''s own Noida job postings; not a group-wide address.', true),
  ('ihcl', 'careers@ihcltata.com', 'Careers – send resumes', 'https://www.tajhotels.com/en-in/contact-us', 'From the Careers section of Taj''s contact page (site blocks automated checks; confirmed via search-engine copy of the page).', true),
  ('ihcl', 'info@ihcltata.com', 'General corporate enquiries', 'https://www.ihcltata.com/contact-us', 'IHCL corporate contact page (site blocks automated checks; confirmed via search-engine copy of the page).', true),
  ('itc', 'contactus@itc.in', 'General queries, ITC Limited', 'https://itcportal.com/careers.html', 'Listed in the footer of ITC''s careers page; not a dedicated recruitment inbox (jobs are applied for online).', true),
  ('fortune', 'contactus@fortunehotels.in', 'Fortune Park Hotels corporate office', 'https://itcportal.com/contact-us.html', 'Listed on parent ITC Ltd''s contact page; Fortune''s own careers site only has an online form.', true),
  ('nile', 'careers@nilehospitality.com', 'Career inquiries / work with us', 'https://www.careersatnile.com/careers', null, true),
  ('nile', 'info@nilehospitality.com', 'General enquiries', 'https://www.nilehospitality.com/contact-us', null, true)
on conflict (source, email) do update set label = excluded.label, found_on = excluded.found_on, note = excluded.note, is_active = excluded.is_active;
