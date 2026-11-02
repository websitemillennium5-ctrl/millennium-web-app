-- When a staff member last had the chat open in the admin portal (bumped by the transcript's polling). If a
-- taken-over chat goes unwatched for a while, the visitor's next poll hands it back to the assistant and notes
-- that the staff member left.
alter table public.chat_sessions add column staff_seen_at timestamptz;
