"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowUpRight, Bot, CheckCircle2, Clock, Headset, LogOut, MessageCircle, Phone, Send, Square, Trash2, UserRound } from "lucide-react";
import { deleteChat, getChatUpdates, releaseChat, replyToChat, takeOverChat } from "@/app/admin/actions";
import { firstName, visitorOnline, type ChatMessage, type ChatMode } from "@/lib/chats";
import type { ChatSession } from "@/lib/data";
import { formatDateTime, formatTime, istDay } from "@/lib/format";
import { whatsappHref } from "@/lib/leads";
import { Badge } from "@/components/portal/ui";
import { initials } from "@/components/portal/student-card";

const avatarHues = ["bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700"];
export const avatarHue = (name: string) => avatarHues[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % avatarHues.length];

export function Avatar({ name, className = "size-9 text-xs" }: { name: string | null; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${className} ${name ? avatarHue(name) : "bg-mist text-muted"}`}>
      {name ? initials(name) : <MessageCircle className="size-[45%]" strokeWidth={1.75} />}
    </span>
  );
}

const longDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dayChip = (iso: string) => (istDay(Date.parse(iso)) === istDay() ? "Today" : longDay.format(new Date(iso)));

/** Poll every few seconds while the visitor is there; slow down once they have gone (nothing new can arrive) and once the chat is over. */
const POLL_MS = { live: 3000, away: 12_000, ended: 30_000 };

function Action({ onClick, disabled, tone = "default", label, children }: { onClick: () => void; disabled?: boolean; tone?: "default" | "ink" | "brand" | "danger"; label?: string; children: React.ReactNode }) {
  const styles = {
    default: "border border-line bg-white text-ink-soft hover:border-ink/25 hover:bg-mist hover:text-ink",
    ink: "bg-ink text-white hover:bg-ink-soft",
    brand: "bg-brand text-white hover:bg-brand-dark",
    danger: "border border-line bg-white text-muted hover:border-red-300 hover:bg-red-50 hover:text-red-700",
  }[tone];
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition disabled:opacity-50 ${styles}`}>
      {children}
    </button>
  );
}

/**
 * One conversation, live: polls for new messages every few seconds, and lets the staff member take the chat
 * over from the assistant, reply to the visitor, hand it back or end it.
 */
export function ChatPanel({ session, staffName, backHref }: { session: ChatSession; staffName: string; backHref: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(session.chat_messages);
  const [mode, setMode] = useState<ChatMode>(session.mode);
  const [takenBy, setTakenBy] = useState(session.taken_by_name);
  const [seenAt, setSeenAt] = useState(session.visitor_seen_at);
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const lastId = messages.at(-1)?.id ?? 0;
  const online = visitorOnline({ visitor_seen_at: seenAt, mode }, now);
  const mine = mode === "staff" && takenBy === staffName;

  // Pull anything new from the server
  const pollMs = mode === "ended" ? POLL_MS.ended : online ? POLL_MS.live : POLL_MS.away;
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState === "hidden") return;
      const res = await getChatUpdates(session.id, lastId).catch(() => null);
      if (!res || stopped) return;
      if (res.messages.length) setMessages((m) => [...m, ...res.messages.filter((x) => !m.some((y) => y.id === x.id))]);
      setMode(res.mode);
      setTakenBy(res.takenByName);
      setSeenAt(res.visitorSeenAt);
      setNow(Date.now());
    };
    const timer = window.setInterval(tick, pollMs);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [session.id, lastId, pollMs]);

  // Keep the newest message in view
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const refresh = async () => {
    const res = await getChatUpdates(session.id, lastId).catch(() => null);
    if (!res) return;
    if (res.messages.length) setMessages((m) => [...m, ...res.messages.filter((x) => !m.some((y) => y.id === x.id))]);
    setMode(res.mode);
    setTakenBy(res.takenByName);
    setSeenAt(res.visitorSeenAt);
    setNow(Date.now());
  };
  const run = (work: () => Promise<void>) => startTransition(async () => {
    await work();
    await refresh();
  });
  const send = () => {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    run(() => replyToChat(session.id, text));
    input.current?.focus();
  };

  const whatsapp = session.phone ? whatsappHref(session.phone) : null;
  const first = messages[0]?.created_at;
  const last = messages.at(-1)?.created_at;
  const minutes = first && last ? Math.max(1, Math.round((Date.parse(last) - Date.parse(first)) / 60_000)) : null;

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link href={backHref} scroll={false} aria-label="Back to chats" className="-ml-1 rounded-full p-1.5 text-muted hover:bg-mist hover:text-ink lg:hidden">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="relative">
          <Avatar name={session.name} className="size-10 text-sm" />
          {online && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-good ring-2 ring-white" aria-label="Online" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-semibold text-ink">{session.name ?? "Anonymous visitor"}</h2>
            {mode === "staff" ? (
              <Badge tone="brand">Live · {mine ? "you" : takenBy ? firstName(takenBy) : "staff"}</Badge>
            ) : mode === "ended" ? (
              <Badge>Ended</Badge>
            ) : session.lead_id ? (
              <Badge tone="good">Enquiry saved</Badge>
            ) : online ? (
              <Badge tone="good">Online now</Badge>
            ) : (
              <Badge>Left mid-chat</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {online ? "Online" : `Started ${formatDateTime(session.started_at)}`}
            {minutes ? ` · ${minutes} min` : ""}
            {session.page && session.page !== "/" ? ` · opened on ${session.page}` : ""}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
          {session.phone && (
            <a href={`tel:${session.phone}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink-soft transition hover:border-ink/25 hover:bg-mist hover:text-ink">
              <Phone className="size-3.5" /> {session.phone}
            </a>
          )}
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink-soft transition hover:border-ink/25 hover:bg-mist hover:text-ink">
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          )}
          {session.lead_id && session.phone && (
            <Link href={`/admin/leads?q=${encodeURIComponent(session.phone)}`} className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink-soft transition hover:border-ink/25 hover:bg-mist hover:text-ink">
              Open lead <ArrowUpRight className="size-3.5" />
            </Link>
          )}
          {/* Only while there is someone to talk to: the visitor is still on the site and the chat hasn't ended */}
          {mode === "bot" && online && (
            <Action tone="brand" disabled={pending} onClick={() => run(() => takeOverChat(session.id))}>
              <Headset className="size-3.5" /> Take over
            </Action>
          )}
          {mode === "staff" && (
            <>
              <Action disabled={pending} onClick={() => run(() => releaseChat(session.id, "bot"))}>
                <Bot className="size-3.5" /> Hand back
              </Action>
              <Action tone="ink" disabled={pending} onClick={() => run(() => releaseChat(session.id, "ended"))}>
                <Square className="size-3" /> End chat
              </Action>
            </>
          )}
          {/* Hard delete: the session and every message in it, gone for good */}
          <Action
            tone="danger"
            label="Delete chat"
            disabled={pending}
            onClick={() => {
              const who = session.name ?? "this visitor";
              if (!window.confirm(`Delete the chat with ${who} and all its messages? This cannot be undone.`)) return;
              startTransition(async () => {
                await deleteChat(session.id);
                router.push(backHref);
                router.refresh();
              });
            }}
          >
            <Trash2 className="size-3.5" /> Delete
          </Action>
        </div>
      </header>

      <div ref={list} className="min-h-0 flex-1 bg-[#ece6dc] bg-[url(/images/chat-wallpaper.svg)] bg-[size:320px_320px] px-4 py-5 admin-dark:bg-[#1b1c20] lg:overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-1">
          <span className="mb-3 self-center rounded-full border border-line bg-white px-3 py-1 text-[11px] font-medium text-muted shadow-[0_1px_2px_rgba(11,18,32,0.05)]">
            {dayChip(session.started_at)}
          </span>
          {messages.map((m, i) => {
            if (m.sender === "system") {
              return (
                <p key={m.id} className="my-2 self-center rounded-full bg-white/80 px-3 py-1 text-center text-[11px] text-muted ring-1 ring-line">
                  {m.text} · {formatTime(m.created_at)}
                </p>
              );
            }
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const startsRun = prev?.sender !== m.sender;
            const endsRun = next?.sender !== m.sender;
            // The visitor sits on the left; the academy (assistant or staff) on the right
            const ours = m.sender !== "visitor";
            const bubble =
              m.sender === "visitor"
                ? `border border-line bg-white text-ink ${endsRun ? "rounded-bl-md" : ""}`
                : m.sender === "staff"
                  ? `bg-ink text-white ${endsRun ? "rounded-br-md" : ""}`
                  : `border border-ink/10 bg-ink/[0.07] text-ink ${endsRun ? "rounded-br-md" : ""}`;
            return (
              <div key={m.id} className={`flex flex-col ${ours ? "items-end" : "items-start"} ${startsRun && i > 0 ? "mt-3" : ""}`}>
                {startsRun && m.sender === "staff" && <span className="mb-0.5 px-1 pr-9 text-[10.5px] font-semibold text-muted">{m.staff_name ?? "Staff"}</span>}
                {/* Avatar and bubble share a row, bottom-aligned; the time sits underneath on its own line */}
                <div className={`flex max-w-[78%] items-end gap-2 ${ours ? "flex-row-reverse" : ""}`}>
                  <span className="w-6 shrink-0">
                    {endsRun && m.sender === "bot" && (
                      <span className="flex size-6 items-center justify-center rounded-full bg-ink/80 text-white" title="Assistant">
                        <Bot className="size-3.5" />
                      </span>
                    )}
                    {endsRun && m.sender === "staff" && <Avatar name={m.staff_name ?? staffName} className="size-6 text-[9px]" />}
                    {endsRun && m.sender === "visitor" &&
                      (session.name ? (
                        <Avatar name={session.name} className="size-6 text-[9px]" />
                      ) : (
                        <span className="flex size-6 items-center justify-center rounded-full border border-line bg-white text-muted" title="Visitor">
                          <UserRound className="size-3.5" strokeWidth={1.75} />
                        </span>
                      ))}
                  </span>
                  <p className={`min-w-0 rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line shadow-[0_1px_2px_rgba(11,18,32,0.05)] ${bubble}`}>{m.text}</p>
                </div>
                {endsRun && (
                  <time dateTime={m.created_at} className={`mt-1 text-[10.5px] text-muted/80 ${ours ? "pr-9" : "pl-9"}`}>
                    {formatTime(m.created_at)}
                  </time>
                )}
              </div>
            );
          })}
          {mode !== "staff" && (
            <p className="mt-4 flex items-center gap-2 self-center rounded-full border border-line bg-white px-3 py-1 text-[11px] text-muted shadow-[0_1px_2px_rgba(11,18,32,0.05)]">
              {mode === "ended" ? (
                <>
                  <Square className="size-3" /> Chat ended
                </>
              ) : session.lead_id ? (
                <>
                  <CheckCircle2 className="size-3.5 text-good" /> Enquiry saved as a lead
                </>
              ) : online ? (
                <>
                  <span className="size-2 rounded-full bg-good" /> Visitor is online · the assistant is handling it
                </>
              ) : (
                <>
                  <Clock className="size-3.5" /> Visitor left without finishing
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <footer className="border-t border-line bg-white p-3">
        {mode === "ended" ? (
          <p className="px-1 text-center text-xs text-muted">This chat has ended.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={mode === "staff" ? `Reply as ${firstName(staffName)}…` : online ? "Type a reply to take over from the assistant…" : "Reply (the visitor will see it when they come back)…"}
              aria-label="Reply"
              className="h-10 min-w-0 flex-1 rounded-full bg-mist px-4 text-sm text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-ink/10"
            />
            <button type="submit" aria-label="Send" disabled={pending || !draft.trim()} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:opacity-50">
              <Send className="size-4" />
            </button>
          </form>
        )}
        {mode === "staff" && !mine && takenBy && (
          <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-muted">
            <LogOut className="size-3" /> {takenBy} is handling this chat. Your replies will show with your name.
          </p>
        )}
      </footer>
    </>
  );
}
