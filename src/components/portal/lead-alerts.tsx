"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clock, Inbox, MessageCircle, Phone, X } from "lucide-react";
import { leadAlerts, type LeadAlert } from "@/app/admin/actions";
import { experienceLabels, leadSources, whatsappHref } from "@/lib/leads";
import { away, canNotify, chimeUrl } from "@/components/portal/alert-tones";
import { initials } from "@/components/portal/student-card";

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
      dismissed: Array.isArray(v?.dismissed) ? v.dismissed.filter((x: unknown): x is string => typeof x === "string") : [],
    };
  } catch {
    return { since: null, dismissed: [] };
  }
}
function saveStore(store: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...store, dismissed: store.dismissed.slice(-200) }));
  } catch {}
}

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
};
const sourceLabel = (source: string) => (leadSources as Record<string, string>)[source] ?? source;
/** What they are after: the course on an enquiry form, the job on the jobs page, or their experience as a fallback. */
const interest = (l: LeadAlert) => l.course ?? l.listing_title ?? (l.experience ? experienceLabels[l.experience] : null);

const sourceChip: Record<string, string> = {
  "jobs page": "bg-accent/10 text-accent-dark",
  "contact page": "bg-sky-100 text-sky-800",
  "course page": "bg-violet-100 text-violet-800",
  chat: "bg-emerald-100 text-emerald-800",
};

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

  const notify = (l: LeadAlert) => {
    if (!canNotify() || Notification.permission !== "granted") return;
    try {
      notes.current.get(l.id)?.close();
      const n = new Notification(`New enquiry from ${l.name}`, {
        body: [interest(l), l.phone, sourceLabel(l.source)].filter(Boolean).join(" · "),
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
        const fresh = res.leads.filter((l) => !store.current.dismissed.includes(l.id));
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
          store.current = { since: res.leads[0].created_at, dismissed: [] };
          saveStore(store.current);
        }
        setAlerts(fresh);
        setNow(t);
      }
      timer = window.setTimeout(tick, document.visibilityState === "hidden" ? POLL_MS.hidden : POLL_MS.visible);
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
    store.current = { ...store.current, dismissed: [...store.current.dismissed, ...ids] };
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
    <div role="status" aria-live="polite" aria-label="New enquiries" className="animate-pop-in">
      <div className="overflow-hidden rounded-3xl bg-white text-ink shadow-[0_24px_60px_-20px_rgba(11,18,32,0.45)] ring-1 ring-ink/10">
        <div className="flex items-center gap-3 bg-accent px-4 py-3 text-white">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Inbox className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{alerts.length === 1 ? "New enquiry" : `${alerts.length} new enquiries`}</p>
            <p className="truncate text-[11.5px] text-white/70">Filled in on the website</p>
          </div>
          {alerts.length > 1 && (
            <button
              type="button"
              onClick={() => dismiss(alerts.map((a) => a.id))}
              className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium transition hover:bg-white/25"
            >
              Dismiss all
            </button>
          )}
        </div>
        <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto">
          {alerts.map((l) => {
            const wa = whatsappHref(l.phone);
            const what = interest(l);
            return (
              <li key={l.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent-dark ring-2 ring-white shadow-sm">
                    {initials(l.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {l.name}
                      {l.city && <span className="font-normal text-muted"> · {l.city}</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted">
                      <span className={`rounded-full px-2 py-px font-medium ${sourceChip[l.source] ?? "bg-mist text-ink-soft"}`}>{sourceLabel(l.source)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {ago(l.created_at, now)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss([l.id])}
                    aria-label="Dismiss"
                    title="Dismiss"
                    className="-mt-1 -mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-mist hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                {(what || l.message) && (
                  <div className="mt-2.5 rounded-2xl rounded-tl-md bg-mist px-3.5 py-2 text-[13px] leading-snug">
                    {what && <p className="font-medium text-ink">{what}</p>}
                    {l.message && <p className={`line-clamp-2 text-ink-soft ${what ? "mt-0.5" : ""}`}>{l.message}</p>}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => open(l.id)}
                    className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition hover:bg-ink-soft"
                  >
                    Open in Leads
                  </button>
                  <a
                    href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}
                    aria-label={`Call ${l.phone}`}
                    title={`Call ${l.phone}`}
                    className="flex size-9 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-mist hover:text-ink"
                  >
                    <Phone className="size-4" />
                  </a>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Message on WhatsApp"
                      title="Message on WhatsApp"
                      className="flex size-9 items-center justify-center rounded-full border border-line text-ink-soft transition hover:bg-mist hover:text-ink"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
