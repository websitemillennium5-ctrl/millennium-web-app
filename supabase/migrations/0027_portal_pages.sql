-- Per-page access for staff accounts. An admin picks which staff-portal pages each staff member may open;
-- null means every page (the default for new accounts, and always the case for admins). The keys match
-- src/lib/portal-pages.ts. Only admins may update staff rows (policy from 0013), so staff cannot widen their
-- own access.
alter table public.profiles add column portal_pages text[];
comment on column public.profiles.portal_pages is 'Staff-portal pages this account may open (keys from src/lib/portal-pages.ts); null = every page. Ignored for admins.';
