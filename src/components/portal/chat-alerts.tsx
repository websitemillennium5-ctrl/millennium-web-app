"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BellRing, Headset } from "lucide-react";
import {
  chatAlerts,
  takeOverChat,
  type ChatAlert,
  type TakenChat,
} from "@/app/admin/actions";
import { visitorOnline } from "@/lib/chats";
import {
  alarmUrl,
  away,
  canNotify,
  pingUrl,
  unlockOnFirstGesture,
} from "@/components/portal/alert-tones";

/**
 * How often the portal asks for unattended chats and replies: a little slower when the tab is in the
 * background, faster while this staff member is in the middle of a live conversation, and fastest while an
 * alarm is ringing so it stops here within seconds once a colleague takes the chat over.
 */
const POLL_MS = {
  visible: 10_000,
  hidden: 30_000,
  liveVisible: 5_000,
  liveHidden: 15_000,
  ringing: 3_000,
  ringingHidden: 5_000,
};
/** Chats this staff member chose to ignore, remembered per browser so the alert doesn't come back after a reload. */
const IGNORED_KEY = "chat-alerts-ignored";

function loadIgnored(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(IGNORED_KEY) ?? "[]");
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
function saveIgnored(ids: string[]) {
  try {
    localStorage.setItem(IGNORED_KEY, JSON.stringify(ids.slice(-200)));
  } catch {}
}

/** That conversation is open on screen right now: the Chats page with this chat selected, in the focused tab. */
const viewing = (id: string) =>
  !away() &&
  location.pathname === "/admin/chats" &&
  new URLSearchParams(location.search).get("chat") === id;

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`;
};
const lastVisitorLine = (a: ChatAlert) =>
  a.chat_messages.find((m) => m.sender === "visitor")?.text ?? null;
/** "/airline-jobs/indigo/123" → "Airline jobs", "/" → "Home page" */
const pageLabel = (path: string) => {
  const first = path.split("/").filter(Boolean)[0];
  return first
    ? first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, " ")
    : "Home page";
};

/**
 * Portal-wide alert for website visitors chatting with the assistant while no staff member has taken over.
 * Shows on every admin page with a looping alarm that only stops once each chat is taken over or ignored
 * here, or once someone else takes it (or it ends) in the meantime.
 */
export function ChatAlerts() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<ChatAlert[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false); // the browser refused to play before the person interacted with the page
  const [pending, startTransition] = useTransition();
  const [notifyState, setNotifyState] = useState<
    NotificationPermission | "unsupported"
  >(() => (canNotify() ? Notification.permission : "unsupported"));
  const ignored = useRef<string[]>([]);
  const showing = useRef<string[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const ping = useRef<HTMLAudioElement | null>(null);
  /** Whether the alarm should be sounding right now, for the moment the browser first lets sound through. */
  const wantRing = useRef(false);
  const notes = useRef(new Map<string, Notification>());
  /** Latest visitor message id already noticed per chat this staff member is handling; empty until the first poll primes it. */
  const seen = useRef<Map<string, number> | null>(null);
  /** Whether this staff member is in the middle of a live chat, which speeds the poll up. */
  const live = useRef(false);

  useEffect(() => {
    ignored.current = loadIgnored();
  }, []);
  // Create both tones up front and let the first click or key press anywhere in the portal unlock them, so an
  // alert can sound the moment it arrives instead of waiting for whatever click happens to come next
  useEffect(() => {
    const alarm = (audio.current ??= Object.assign(new Audio(alarmUrl()), {
      loop: true,
    }));
    const reply = (ping.current ??= new Audio(pingUrl()));
    return unlockOnFirstGesture([alarm, reply], () => {
      if (!wantRing.current || !alarm.paused) return;
      alarm
        .play()
        .then(() => setMuted(false))
        .catch(() => {});
    });
  }, []);
  useEffect(() => {
    showing.current = alerts.map((a) => a.id);
  }, [alerts]);

  // Browsers only grant notification permission from a click, so ask on the first one anywhere in the portal
  const askToNotify = () => {
    if (!canNotify() || Notification.permission !== "default") return;
    Notification.requestPermission()
      .then((p) => setNotifyState(p))
      .catch(() => {});
  };
  useEffect(() => {
    if (notifyState !== "default") return;
    window.addEventListener("pointerdown", askToNotify, { once: true });
    return () => window.removeEventListener("pointerdown", askToNotify);
  }, [notifyState]);

  // Desktop notification for a waiting chat, re-sent on every poll while the person is away from the portal
  // (same tag, so it re-alerts instead of piling up); clicking it brings the portal up on that chat
  const notify = (a: ChatAlert) => {
    if (!canNotify() || Notification.permission !== "granted") return;
    try {
      notes.current.get(a.id)?.close();
      const n = new Notification(
        a.name
          ? `${a.name} is waiting in chat`
          : "A visitor is waiting in chat",
        {
          body: `${lastVisitorLine(a) ?? "Started a chat"}${a.page ? ` · on ${a.page}` : ""}`,
          tag: `chat-${a.id}`,
          icon: "/images/logo-mark.png",
          requireInteraction: true,
          renotify: true, // not in the DOM typings yet, but Chrome honours it
        } as NotificationOptions,
      );
      n.onclick = () => {
        window.focus();
        router.push(`/admin/chats?chat=${a.id}`);
        n.close();
      };
      notes.current.set(a.id, n);
    } catch {}
  };
  const closeNote = (id: string) => {
    notes.current.get(id)?.close();
    notes.current.delete(id);
  };

  // A visitor replied in a chat this staff member is handling while that conversation isn't on screen:
  // desktop notification (clicking it opens the chat) plus a short ping
  const notifyReply = (t: TakenChat, text: string) => {
    if (canNotify() && Notification.permission === "granted") {
      try {
        const n = new Notification(`${t.name ?? "Visitor"} replied in chat`, {
          body: text,
          tag: `reply-${t.id}`,
          icon: "/images/logo-mark.png",
          requireInteraction: true,
          renotify: true,
        } as NotificationOptions);
        n.onclick = () => {
          window.focus();
          router.push(`/admin/chats?chat=${t.id}`);
          n.close();
        };
      } catch {}
    }
    const el = ping.current ?? (ping.current = new Audio(pingUrl()));
    el.currentTime = 0;
    el.play().catch(() => {});
  };

  // Poll for unattended chats; a chat stays in the alert once it has appeared, even if the visitor goes quiet,
  // until this staff member acts on it or the server says someone took it over or it ended
  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const tick = async () => {
      window.clearTimeout(timer);
      const res = await chatAlerts(showing.current).catch(() => null);
      if (stopped) return;
      if (res) {
        const t = Date.now();
        const next = res.waiting.filter(
          (s) =>
            s.mode === "bot" &&
            !ignored.current.includes(s.id) &&
            (showing.current.includes(s.id) || visitorOnline(s, t)),
        );
        showing.current = next.map((a) => a.id);
        for (const id of [...notes.current.keys()])
          if (!showing.current.includes(id)) closeNote(id);
        if (away()) next.forEach(notify);
        setAlerts(next);
        setNow(t);

        // Replies in the chats this staff member is handling. The first poll only records where each chat is,
        // so reloading the portal doesn't re-announce messages already read.
        const latest = new Map(
          res.taken.map((c) => [c.id, c.chat_messages[0] ?? null] as const),
        );
        if (seen.current) {
          for (const c of res.taken) {
            const last = latest.get(c.id);
            // A chat seen for the first time (just taken over) is only recorded: its earlier messages were read in the popup or the transcript
            if (
              last &&
              seen.current.has(c.id) &&
              last.id > (seen.current.get(c.id) ?? 0) &&
              !viewing(c.id)
            )
              notifyReply(c, last.text);
          }
        }
        seen.current = new Map([...latest].map(([id, m]) => [id, m?.id ?? 0]));
        live.current = res.taken.length > 0;
      }
      const hidden = document.visibilityState === "hidden";
      const wait = showing.current.length
        ? hidden
          ? POLL_MS.ringingHidden
          : POLL_MS.ringing
        : live.current
          ? hidden
            ? POLL_MS.liveHidden
            : POLL_MS.liveVisible
          : hidden
            ? POLL_MS.hidden
            : POLL_MS.visible;
      timer = window.setTimeout(tick, wait);
    };
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ring while anything is waiting. Until the person has interacted with the page the browser refuses to play,
  // and the unlock above starts the alarm on their first click or key press.
  const ringing = alerts.length > 0;
  useEffect(() => {
    wantRing.current = ringing;
    if (!ringing) return;
    const el = (audio.current ??= Object.assign(new Audio(alarmUrl()), {
      loop: true,
    }));
    let gone = false;
    el.play()
      .then(() => !gone && setMuted(false))
      .catch(() => !gone && setMuted(true));
    return () => {
      gone = true;
      wantRing.current = false;
      el.pause();
      el.currentTime = 0;
    };
  }, [ringing]);

  const dismiss = (id: string) => {
    closeNote(id);
    showing.current = showing.current.filter((x) => x !== id);
    setAlerts((list) => list.filter((a) => a.id !== id));
  };
  const ignore = (id: string) => {
    ignored.current = [...ignored.current, id];
    saveIgnored(ignored.current);
    dismiss(id);
  };
  // Respond to the click at once: the alert and alarm go and the chat opens immediately, while the take-over
  // is recorded in parallel; the page refreshes once that lands (if it fails, the next poll brings the alert back)
  const takeOver = (id: string) => {
    dismiss(id);
    router.push(`/admin/chats?chat=${id}`);
    startTransition(async () => {
      await takeOverChat(id).catch(() => {});
      router.refresh();
    });
  };

  // Warm the Chats route up while the alarm is ringing, so opening the chat doesn't wait for it to load
  useEffect(() => {
    if (ringing) router.prefetch("/admin/chats");
  }, [ringing, router]);

  if (!alerts.length) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Visitors waiting in chat"
      className="flex flex-col items-end gap-2"
    >
      {alerts.slice(0, 4).map((a) => {
        const line = lastVisitorLine(a);
        const here = visitorOnline(a, now);
        return (
          <div
            key={a.id}
            className="relative w-full animate-pop-in rounded-[1.35rem] border border-white/60 bg-white/75 p-3 text-ink shadow-[0_1px_2px_rgba(11,18,32,0.06),0_16px_40px_-16px_rgba(11,18,32,0.35)] ring-1 ring-ink/[0.05] backdrop-blur-2xl backdrop-saturate-[1.8] admin-dark:border-white/10 admin-dark:bg-[#2a2b31]/80 admin-dark:text-white"
          >
            <div className="flex items-start gap-3">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-[0.7rem] bg-gradient-to-b from-[#1f2b44] to-[#0b1220] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                {here && (
                  <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-good ring-2 ring-white admin-dark:ring-[#2a2b31]" />
                )}
                <BellRing className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13px] font-semibold">
                    {here ? "Visitor chatting" : "Visitor left"}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted">
                    {ago(a.started_at, now)}
                  </span>
                </div>
                <p className="truncate text-[13px] leading-snug">
                  <span className="font-medium">{a.name ?? "New visitor"}</span>
                  {a.page && (
                    <span className="text-muted"> · {pageLabel(a.page)}</span>
                  )}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-snug text-ink-soft admin-dark:text-white/70">
                  {line ?? "Started a chat, hasn't typed yet"}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => ignore(a.id)}
                className="h-7 rounded-full px-3 text-[12px] font-medium text-muted transition hover:bg-ink/5 hover:text-ink admin-dark:hover:bg-white/10 admin-dark:hover:text-white"
              >
                Ignore
              </button>
              <button
                type="button"
                disabled={pending || !here}
                onClick={() => takeOver(a.id)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ink px-3 text-[12px] font-semibold text-white transition hover:bg-ink-soft disabled:opacity-40 admin-dark:bg-white admin-dark:text-ink"
              >
                <Headset className="size-3.5" /> Take over
              </button>
            </div>
          </div>
        );
      })}
      {(alerts.length > 4 || muted || notifyState === "default") && (
        <p className="mr-1 text-[11px] text-muted">
          {alerts.length > 4 && (
            <span>{alerts.length - 4} more in Chats · </span>
          )}
          {muted ? (
            "Click anywhere to turn the sound on"
          ) : notifyState === "default" ? (
            <button
              type="button"
              onClick={askToNotify}
              className="font-medium text-ink-soft underline decoration-line underline-offset-2 hover:text-ink"
            >
              Allow alerts while you are in another app
            </button>
          ) : null}
        </p>
      )}
    </div>
  );
}
