"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BellRing, Clock, Globe, Headset } from "lucide-react";
import { chatAlerts, takeOverChat, type ChatAlert, type TakenChat } from "@/app/admin/actions";
import { visitorOnline } from "@/lib/chats";

/**
 * How often the portal asks for unattended chats and replies: a little slower when the tab is in the
 * background, faster while this staff member is in the middle of a live conversation.
 */
const POLL_MS = { visible: 10_000, hidden: 30_000, liveVisible: 5_000, liveHidden: 15_000 };
/** Chats this staff member chose to ignore, remembered per browser so the alert doesn't come back after a reload. */
const IGNORED_KEY = "chat-alerts-ignored";

function loadIgnored(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(IGNORED_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function saveIgnored(ids: string[]) {
  try {
    localStorage.setItem(IGNORED_KEY, JSON.stringify(ids.slice(-200)));
  } catch {}
}

/**
 * A short tune ([frequency, start second] per note) rendered once to a WAV blob for an <audio> element. Audio
 * elements keep playing in a background tab, where browsers throttle timers and would silence anything
 * scheduled from JavaScript.
 */
function toneUrl(notes: [number, number][], seconds: number) {
  const rate = 22050;
  const n = Math.round(rate * seconds);
  const pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let v = 0;
    for (const [freq, at] of notes) {
      const dt = t - at;
      if (dt >= 0 && dt < 0.18) v += Math.sin(2 * Math.PI * freq * t) * Math.min(1, dt / 0.01, (0.18 - dt) / 0.05);
    }
    pcm[i] = Math.round(v * 0.25 * 32767);
  }
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const ascii = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + n * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, n * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
/** Looping three-note alarm for a visitor nobody has answered. */
const alarmUrl = () =>
  toneUrl(
    [
      [880, 0],
      [1175, 0.22],
      [880, 0.44],
    ],
    1.6,
  );
/** Two-note ping for a new message in a chat this staff member is handling. */
const pingUrl = () =>
  toneUrl(
    [
      [880, 0],
      [1175, 0.14],
    ],
    0.6,
  );

const canNotify = () => typeof window !== "undefined" && "Notification" in window;
/** The portal is not what the person is looking at: another tab, another app, or the browser window in the background. */
const away = () => document.visibilityState === "hidden" || !document.hasFocus();
/** That conversation is open on screen right now: the Chats page with this chat selected, in the focused tab. */
const viewing = (id: string) => !away() && location.pathname === "/admin/chats" && new URLSearchParams(location.search).get("chat") === id;

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`;
};
const lastVisitorLine = (a: ChatAlert) => a.chat_messages.find((m) => m.sender === "visitor")?.text ?? null;
/** "/airline-jobs/indigo/123" → "Airline jobs", "/" → "Home page" */
const pageLabel = (path: string) => {
  const first = path.split("/").filter(Boolean)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, " ") : "Home page";
};
const initial = (name: string | null) => (name?.trim()[0] ?? "?").toUpperCase();

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
  const [notifyState, setNotifyState] = useState<NotificationPermission | "unsupported">(() => (canNotify() ? Notification.permission : "unsupported"));
  const ignored = useRef<string[]>([]);
  const showing = useRef<string[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const ping = useRef<HTMLAudioElement | null>(null);
  const notes = useRef(new Map<string, Notification>());
  /** Latest visitor message id already noticed per chat this staff member is handling; empty until the first poll primes it. */
  const seen = useRef<Map<string, number> | null>(null);
  /** Whether this staff member is in the middle of a live chat, which speeds the poll up. */
  const live = useRef(false);

  useEffect(() => {
    ignored.current = loadIgnored();
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
      const n = new Notification(a.name ? `${a.name} is waiting in chat` : "A visitor is waiting in chat", {
        body: `${lastVisitorLine(a) ?? "Started a chat"}${a.page ? ` · on ${a.page}` : ""}`,
        tag: `chat-${a.id}`,
        icon: "/images/logo-mark.png",
        requireInteraction: true,
        renotify: true, // not in the DOM typings yet, but Chrome honours it
      } as NotificationOptions);
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
        const next = res.waiting.filter((s) => s.mode === "bot" && !ignored.current.includes(s.id) && (showing.current.includes(s.id) || visitorOnline(s, t)));
        showing.current = next.map((a) => a.id);
        for (const id of [...notes.current.keys()]) if (!showing.current.includes(id)) closeNote(id);
        if (away()) next.forEach(notify);
        setAlerts(next);
        setNow(t);

        // Replies in the chats this staff member is handling. The first poll only records where each chat is,
        // so reloading the portal doesn't re-announce messages already read.
        const latest = new Map(res.taken.map((c) => [c.id, c.chat_messages[0] ?? null] as const));
        if (seen.current) {
          for (const c of res.taken) {
            const last = latest.get(c.id);
            // A chat seen for the first time (just taken over) is only recorded: its earlier messages were read in the popup or the transcript
            if (last && seen.current.has(c.id) && last.id > (seen.current.get(c.id) ?? 0) && !viewing(c.id)) notifyReply(c, last.text);
          }
        }
        seen.current = new Map([...latest].map(([id, m]) => [id, m?.id ?? 0]));
        live.current = res.taken.length > 0;
      }
      const hidden = document.visibilityState === "hidden";
      timer = window.setTimeout(tick, live.current ? (hidden ? POLL_MS.liveHidden : POLL_MS.liveVisible) : hidden ? POLL_MS.hidden : POLL_MS.visible);
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

  // Ring while anything is waiting. Browsers only allow sound after the person has interacted with the page,
  // so a refused play is retried on their first click or key press.
  const ringing = alerts.length > 0;
  useEffect(() => {
    if (!ringing) return;
    const el = audio.current ?? (audio.current = Object.assign(new Audio(alarmUrl()), { loop: true }));
    let gone = false;
    const play = () =>
      el
        .play()
        .then(() => !gone && setMuted(false))
        .catch(() => !gone && setMuted(true));
    const retry = () => el.paused && play();
    play();
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
    return () => {
      gone = true;
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
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
  const takeOver = (id: string) =>
    startTransition(async () => {
      await takeOverChat(id);
      dismiss(id);
      router.push(`/admin/chats?chat=${id}`);
    });

  if (!alerts.length) return null;

  return (
    <div role="alertdialog" aria-live="assertive" aria-label="Visitors waiting in chat" className="fixed right-4 bottom-4 z-[80] w-[min(23rem,calc(100vw-2rem))] animate-pop-in">
      <div className="overflow-hidden rounded-3xl bg-white text-ink shadow-[0_24px_60px_-20px_rgba(11,18,32,0.45)] ring-1 ring-ink/10">
        <div className="relative flex items-center gap-3 bg-ink px-4 py-3 text-white">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/15" />
            <BellRing className="relative size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{alerts.length === 1 ? "A visitor is chatting" : `${alerts.length} visitors are chatting`}</p>
            <p className="truncate text-[11.5px] text-white/60">{muted ? "Click anywhere to turn the sound on" : "Nobody has replied yet"}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">
            <span className="size-1.5 rounded-full bg-green-400" />
            Live
          </span>
        </div>
        {notifyState === "default" && (
          <button type="button" onClick={askToNotify} className="flex w-full items-center justify-between gap-2 border-b border-line bg-mist px-4 py-2 text-left text-[12px] text-ink-soft hover:text-ink">
            Get alerted while you are in another app or tab <span className="shrink-0 font-semibold text-ink">Allow</span>
          </button>
        )}
        {notifyState === "denied" && (
          <p className="border-b border-line bg-mist px-4 py-2 text-[12px] text-muted">Notifications are blocked for this site in your browser, so alerts only show while this tab is open.</p>
        )}
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
          {alerts.map((a) => {
            const line = lastVisitorLine(a);
            const here = visitorOnline(a, now);
            return (
              <li key={a.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 ring-2 ring-white shadow-sm">
                    {initial(a.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {a.name ?? "New visitor"}
                      {a.phone && <span className="font-normal text-muted"> · {a.phone}</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted">
                      {a.page && (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="size-3" /> {pageLabel(a.page)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {ago(a.started_at, now)}
                      </span>
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 line-clamp-2 rounded-2xl rounded-tl-md bg-mist px-3.5 py-2 text-[13px] leading-snug text-ink">
                  {line ?? <span className="text-muted">Started a chat, hasn&apos;t typed yet</span>}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending || !here}
                    onClick={() => takeOver(a.id)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition hover:bg-ink-soft disabled:opacity-50"
                  >
                    <Headset className="size-4" /> {here ? "Take over" : "Visitor left"}
                  </button>
                  <button
                    type="button"
                    onClick={() => ignore(a.id)}
                    className="inline-flex h-9 items-center justify-center rounded-full px-3.5 text-[13px] font-medium text-muted transition hover:bg-mist hover:text-ink"
                  >
                    Ignore
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
