"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Headset, Search, X } from "lucide-react";
import { listChats } from "@/app/admin/actions";
import { chatHref, type ChatQuery, type ChatView } from "@/lib/chat-query";
import { chatUnread, visitorOnline } from "@/lib/chats";
import type { ChatSession, ChatSummary } from "@/lib/data";
import { formatTime, istDay } from "@/lib/format";
import { Avatar, ChatPanel } from "@/components/portal/chat-panel";

const views: { value: ChatView; label: string }[] = [
  { value: "", label: "All" },
  { value: "enquiry", label: "Enquiries" },
  { value: "left", label: "Left mid-chat" },
];

/** Poll quickly while a visitor is online (their messages land within seconds); otherwise a new chat can wait a little. */
const LIST_POLL_MS = { live: 4000, idle: 20_000 };

const shortDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
/** "12:58 am" for today's chats, "3 Nov" for older ones. */
const whenLabel = (iso: string, now: number) => (istDay(Date.parse(iso)) === istDay(now) ? formatTime(iso) : shortDay.format(new Date(iso)));

/** Preview line: the latest thing the visitor or a staff member said (the list carries the last few messages, newest first). */
const lastLine = (messages: ChatSummary["chat_messages"]) => {
  const m = messages.find((x) => x.sender === "visitor" || x.sender === "staff") ?? messages[0];
  return m ? (m.sender === "staff" ? `You: ${m.text}` : m.text) : null;
};

const matches = (s: ChatSummary, query: ChatQuery) => {
  const q = query.q.toLowerCase();
  if (q && ![s.name, s.phone].some((v) => v?.toLowerCase().includes(q))) return false;
  return query.view === "enquiry" ? Boolean(s.lead_id) : query.view === "left" ? !s.lead_id : true;
};

/**
 * Inbox layout: conversations down the left, the selected one live on the right. The list asks the server for
 * changes every few seconds, so new chats, replies and unread marks appear on their own. On phones the list and
 * the transcript take turns (picking a chat opens it; Back returns to the list).
 */
export function ChatInbox({ initial, query, selected, staffName }: { initial: ChatSummary[]; query: ChatQuery; selected: ChatSession | null; staffName: string }) {
  const [sessions, setSessions] = useState(initial);
  const [now, setNow] = useState(() => Date.now());

  const anyOnline = sessions.some((s) => visitorOnline(s, now));
  const pollMs = anyOnline ? LIST_POLL_MS.live : LIST_POLL_MS.idle;

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState === "hidden") return;
      const list = await listChats().catch(() => null);
      if (list && !stopped) {
        setSessions(list);
        setNow(Date.now());
      }
    };
    // Coming back to the tab refreshes straight away instead of waiting out the idle interval
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(tick, pollMs);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollMs]);

  // The thread being read never counts as unread, even before the server has recorded the read
  const unread = (s: ChatSummary) => s.id !== selected?.id && chatUnread(s);
  const searched = sessions.filter((s) => matches(s, { ...query, view: "" }));
  const counts: Record<ChatView, number> = {
    "": searched.filter(unread).length,
    enquiry: searched.filter((s) => s.lead_id && unread(s)).length,
    left: searched.filter((s) => !s.lead_id && unread(s)).length,
  };
  const shown = searched.filter((s) => matches(s, query));
  const opened = Boolean(query.chat);

  return (
    <div className="grid overflow-hidden rounded-2xl border border-line bg-white lg:h-[calc(100dvh-12.5rem)] lg:min-h-[30rem] lg:grid-cols-[21rem_1fr]">
      {/* ── Conversation list ── */}
      <aside className={`min-h-0 flex-col border-line lg:flex lg:border-r ${opened ? "hidden" : "flex"}`}>
        <div className="border-b border-line p-2">
          <form action="/admin/chats" className="flex h-9 items-center gap-2 rounded-xl bg-mist/70 pr-1 pl-3 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-ink/10">
            {query.view && <input type="hidden" name="view" value={query.view} />}
            <Search className="size-4 shrink-0 text-muted" />
            <input name="q" defaultValue={query.q} placeholder="Search name or phone…" className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70" />
            {query.q && (
              <Link href={chatHref(query, { q: "", chat: "" })} aria-label="Clear search" className="rounded-full p-1 text-muted hover:bg-white hover:text-ink">
                <X className="size-3.5" />
              </Link>
            )}
          </form>
          <div className="mt-2 flex gap-0.5 rounded-xl bg-mist/70 p-1" role="tablist" aria-label="Show">
            {views.map((v) => {
              const active = query.view === v.value;
              return (
                <Link
                  key={v.value}
                  href={chatHref(query, { view: v.value, chat: "" })}
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[12.5px] whitespace-nowrap transition ${
                    active ? "bg-white font-semibold text-ink shadow-[0_1px_3px_rgba(24,24,27,0.12)]" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {v.label}
                  {counts[v.value] > 0 && (
                    <span className={`rounded-full px-1.5 text-[10.5px] leading-4 font-semibold tabular-nums ${active ? "bg-ink text-white" : "bg-white/80 text-muted"}`}>{counts[v.value]}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-line lg:overflow-y-auto">
          {shown.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No chats match.</li>}
          {shown.map((s) => {
            const active = s.id === selected?.id;
            const isNew = unread(s);
            const online = visitorOnline(s, now);
            const preview = lastLine(s.chat_messages);
            return (
              <li key={s.id}>
                <Link
                  href={chatHref(query, { chat: s.id })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={`relative flex items-start gap-3 px-3.5 py-3 transition ${active ? "bg-mist/70" : "hover:bg-mist/40"}`}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-ink" aria-hidden />}
                  <span className="relative">
                    <Avatar name={s.name} />
                    {online && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-good ring-2 ring-white" aria-label="Online" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm text-ink ${active || isNew ? "font-semibold" : "font-medium"}`}>{s.name ?? "Anonymous visitor"}</span>
                      <span className={`flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums ${isNew ? "font-semibold text-ink" : "text-muted"}`}>
                        {whenLabel(s.updated_at, now)}
                        {isNew && <span className="size-2 rounded-full bg-brand" aria-label="Unread" />}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      {s.mode === "staff" ? (
                        <Headset className="size-3.5 shrink-0 text-brand" aria-label="Live with staff" />
                      ) : s.lead_id ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-good" />
                      ) : (
                        <Clock className="size-3.5 shrink-0 text-muted/70" />
                      )}
                      <span className={`truncate text-xs ${isNew ? "font-medium text-ink-soft" : "text-muted"}`}>{preview ?? "No reply yet"}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ── Transcript ── */}
      <section className={`min-h-0 flex-col bg-canvas lg:flex ${opened ? "flex" : "hidden"}`}>
        {selected ? (
          <ChatPanel key={selected.id} session={selected} staffName={staffName} backHref={chatHref(query, { chat: "" })} />
        ) : (
          <p className="m-auto p-10 text-center text-sm text-muted">Pick a conversation to read it, or take it over and reply.</p>
        )}
      </section>
    </div>
  );
}
