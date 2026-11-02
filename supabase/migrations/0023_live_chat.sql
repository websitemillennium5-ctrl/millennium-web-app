-- Live chat: staff can take over a website chat from the admin portal and reply to the visitor directly.
-- Messages move out of the chat_sessions.messages JSON blob into one row each, so the visitor's browser and a
-- staff member can write to the same conversation at the same time. Visitors still go through Server Actions
-- with the service-role key (no public policies); staff read and reply through RLS.

create table public.chat_messages (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.chat_sessions (id) on delete cascade,
  sender      text not null check (sender in ('bot', 'visitor', 'staff', 'system')),
  text        text not null,
  staff_id    uuid references public.profiles (id) on delete set null,  -- who replied, for staff messages
  staff_name  text,
  created_at  timestamptz not null default now()
);

create index chat_messages_session_idx on public.chat_messages (session_id, id);

alter table public.chat_messages enable row level security;

create policy "staff read chat messages" on public.chat_messages for select to authenticated using ((select public.is_staff()));
create policy "staff write chat messages" on public.chat_messages for insert to authenticated with check ((select public.is_staff()));

alter table public.chat_sessions
  add column mode            text not null default 'bot' check (mode in ('bot', 'staff', 'ended')),
  add column taken_by        uuid references public.profiles (id) on delete set null,
  add column taken_by_name   text,
  add column taken_at        timestamptz,
  add column visitor_seen_at timestamptz not null default now();  -- bumped on every poll while the chat window is open

create policy "staff update chat sessions" on public.chat_sessions
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Carry the transcripts saved so far across to the new table, in order.
insert into public.chat_messages (session_id, sender, text, created_at)
select s.id,
       case when m.value ->> 'from' = 'you' then 'visitor' else 'bot' end,
       coalesce(m.value ->> 'text', ''),
       coalesce((m.value ->> 'at')::timestamptz, s.started_at)
from public.chat_sessions s
cross join lateral jsonb_array_elements(s.messages) with ordinality as m (value, ord)
order by s.started_at, m.ord;

alter table public.chat_sessions drop column messages;
