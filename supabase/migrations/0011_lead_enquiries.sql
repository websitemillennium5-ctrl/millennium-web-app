-- Website enquiries (contact and course pages) are saved as leads too, next to the jobs-page applicants.
-- Staff track each lead's follow-up with `status` on the admin Leads page.

alter table public.leads
  add column course  text,                 -- course picked on the enquiry form
  add column message text,                 -- free-text message from the enquiry form
  add column status  text not null default 'new'
    check (status in ('new', 'contacted', 'converted', 'not_interested'));

create index leads_status_idx on public.leads (status, created_at desc);
