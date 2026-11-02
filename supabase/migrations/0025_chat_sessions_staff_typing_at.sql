-- Set while a staff member is typing a reply in the admin portal; the visitor's chat shows a typing indicator
-- while this is only a few seconds old.
alter table public.chat_sessions add column staff_typing_at timestamptz;
