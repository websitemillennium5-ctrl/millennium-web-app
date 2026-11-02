-- When staff last opened a chat in the admin portal. A session is unread while this is null or older than
-- updated_at (the visitor wrote more after staff read it). Set from the Chats page with the service-role key.
alter table public.chat_sessions add column read_at timestamptz;
