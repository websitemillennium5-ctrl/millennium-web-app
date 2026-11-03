"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Inbox, X } from "lucide-react";
import { leadAlerts, type LeadAlert } from "@/app/admin/actions";
import { experienceLabels, leadSources } from "@/lib/leads";
import {
  away,
  canNotify,
  chimeUrl,
  unlockOnFirstGesture,
} from "@/components/portal/alert-tones";

/** How often the portal checks for new enquiries: slower when the tab is in the background. */
const POLL_MS = { visible: 15_000, hidden: 45_000 };
/**
 * Remembered per browser: `since` is the newest enquiry already shown here (so the poll only asks for later
 * ones), `dismissed` the ones closed without being acted on, so they don't come back after a reload.
 */
const STORE_KEY = "lead-alerts";
type Store = { since: string | null; dismissed: string[] };

function loadStore(): Store {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    return {
      since: typeof v?.since === "string" ? v.since : null,
      dismissed: Array.isArray(v?.dismissed)
        ? v.dismissed.filter((x: unknown): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return { since: null, dismissed: [] };
  }
}
function saveStore(store: Store) {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ ...store, dismissed: store.dismissed.slice(-200) }),
    );
  } catch {}
}

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
};
const sourceLabel = (source: string) =>
  (leadSources as Record<string, string>)[source] ?? source;
/** What they are after: the course on an enquiry form, the job on the jobs page, or their experience as a fallback. */
const interest = (l: LeadAlert) =>
  l.course ??
  l.listing_title ??
  (l.experience ? experienceLabels[l.experience] : null);

/**
 * Portal-wide popup for enquiries filled in on the website (contact and course pages, the jobs-page applicant
 * form and the chat). Shows on every admin page with a chime, and a desktop notification when the person is in
 * another tab or app. Each enquiry stays until it is opened or dismissed here, or someone changes its status.
 */
export function LeadAlerts() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<LeadAlert[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const store = useRef<Store>({ since: null, dismissed: [] });
  /** Enquiries already announced in this tab, so a poll only chimes for ones it hasn't seen. */
  const known = useRef(new Set<string>());
  const chime = useRef<HTMLAudioElement | null>(null);
  const notes = useRef(new Map<string, Notification>());

  // Create the chime up front and let the first click or key press anywhere in the portal unlock it
  useEffect(() => {
    return unlockOnFirstGesture([(chime.current ??= new Audio(chimeUrl()))]);
  }, []);

  const notify = (l: LeadAlert) => {
    if (!canNotify() || Notification.permission !== "granted") return;
    try {
      notes.current.get(l.id)?.close();
      const n = new Notification(`New enquiry from ${l.name}`, {
        body: [interest(l), l.phone, sourceLabel(l.source)]
          .filter(Boolean)
          .join(" · "),
        tag: `lead-${l.id}`,
        icon: "/images/logo-mark.png",
      });
      n.onclick = () => {
        window.focus();
        router.push("/admin/leads");
        n.close();
      };
      notes.current.set(l.id, n);
    } catch {}
  };
  const closeNote = (id: string) => {
    notes.current.get(id)?.close();
    notes.current.delete(id);
  };

  useEffect(() => {
    store.current = loadStore();
    let stopped = false;
    let timer = 0;
    const tick = async () => {
      window.clearTimeout(timer);
      const res = await leadAlerts(store.current.since).catch(() => null);
      if (stopped) return;
      if (res) {
        const t = Date.now();
        if (!store.current.since) {
          // First ever poll in this browser: only enquiries from now on are announced
          store.current = { ...store.current, since: res.now };
          saveStore(store.current);
        }
        const fresh = res.leads.filter(
          (l) => !store.current.dismissed.includes(l.id),
        );
        const arrived = fresh.filter((l) => !known.current.has(l.id));
        fresh.forEach((l) => known.current.add(l.id));
        if (arrived.length) {
          const el = chime.current ?? (chime.current = new Audio(chimeUrl()));
          el.currentTime = 0;
          el.play().catch(() => {}); // refused until the person has interacted with the page
          if (away()) arrived.forEach(notify);
        }
        // Everything returned has been dealt with: move the watermark past it so the poll and the dismissed
        // list stay small. Only ever advanced to an enquiry actually seen, never to the clock, so one still being
        // saved at the moment of the poll cannot slip through.
        if (res.leads.length && !fresh.length) {
          // Keep the ids just dismissed in case the server still returns them once more
          store.current = {
            since: res.leads[0].created_at,
            dismissed: res.leads.map((l) => l.id),
          };
          saveStore(store.current);
        }
        setAlerts(fresh);
        setNow(t);
      }
      timer = window.setTimeout(
        tick,
        document.visibilityState === "hidden"
          ? POLL_MS.hidden
          : POLL_MS.visible,
      );
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

  const dismiss = (ids: string[]) => {
    ids.forEach(closeNote);
    store.current = {
      ...store.current,
      dismissed: [...store.current.dismissed, ...ids],
    };
    saveStore(store.current);
    setAlerts((list) => list.filter((a) => !ids.includes(a.id)));
  };
  const open = (id: string) => {
    dismiss([id]);
    router.push("/admin/leads");
    router.refresh();
  };

  useEffect(() => {
    if (alerts.length) router.prefetch("/admin/leads");
  }, [alerts.length, router]);

  if (!alerts.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="New enquiries"
      className="flex flex-col items-end gap-2"
    >
      {alerts.length > 1 && (
        <button
          type="button"
          onClick={() => dismiss(alerts.map((a) => a.id))}
          className="mr-1 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          Clear all
        </button>
      )}
      {alerts.slice(0, 4).map((l) => {
        const what = interest(l);
        return (
          <div
            key={l.id}
            className="group relative w-full animate-pop-in cursor-pointer rounded-[1.35rem] border border-white/60 bg-white/75 p-3 pr-9 text-ink shadow-[0_1px_2px_rgba(11,18,32,0.06),0_16px_40px_-16px_rgba(11,18,32,0.35)] ring-1 ring-ink/[0.05] backdrop-blur-2xl backdrop-saturate-[1.8] transition hover:bg-white/90 admin-dark:border-white/10 admin-dark:bg-[#2a2b31]/80 admin-dark:text-white"
            onClick={() => open(l.id)}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              (e.preventDefault(), open(l.id))
            }
            role="button"
            tabIndex={0}
            aria-label={`New enquiry from ${l.name}. Open in Leads`}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.7rem] bg-gradient-to-b from-[#c42d39] to-[#a2202b] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                <Inbox className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13px] font-semibold">
                    New enquiry
                  </p>
                  <span className="shrink-0 text-[11px] text-muted">
                    {ago(l.created_at, now)}
                  </span>
                </div>
                <p className="truncate text-[13px] leading-snug">
                  <span className="font-medium">{l.name}</span>
                  <span className="text-muted"> · {sourceLabel(l.source)}</span>
                </p>
                {(what || l.message) && (
                  <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-snug text-ink-soft admin-dark:text-white/70">
                    {what ?? l.message}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismiss([l.id]);
              }}
              aria-label="Dismiss"
              title="Dismiss"
              className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full text-muted/70 transition hover:bg-ink/10 hover:text-ink admin-dark:hover:bg-white/10 admin-dark:hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
      {alerts.length > 4 && (
        <p className="mr-1 text-[11px] text-muted">
          {alerts.length - 4} more in Leads
        </p>
      )}
    </div>
  );
}
