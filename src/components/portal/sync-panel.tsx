"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Clock, Cloud, ExternalLink, Laptop, Layers, Loader2, RefreshCw, Search, ShieldCheck, Sparkles, Square, XCircle } from "lucide-react";
import { cancelSync, requestSync } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/portal/form";
import {
  GITHUB_CRON_UTC,
  GITHUB_REPO,
  GITHUB_SCHEDULE,
  GITHUB_WORKFLOW,
  isActiveRun,
  jobsFilterKey,
  runTargets,
  WORKER_TIMEOUT_MS,
  type GithubRun,
  type SourceStat,
  type SyncResult,
  type SyncRun,
  type SyncWorker,
} from "@/lib/sync";

// ───────── Helpers ─────────

/** "just now", "4 min ago", "3 h ago", "2 days ago". */
function ago(iso: string | null, now: number) {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 30) return "just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function duration(run: SyncRun, now: number) {
  if (!run.started_at) return null;
  const s = Math.round(((run.finished_at ? Date.parse(run.finished_at) : now) - Date.parse(run.started_at)) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** Time until the next daily GitHub sync, e.g. "7 h 12 min". */
function untilNextCloudSync(now: number) {
  const next = new Date(now);
  next.setUTCHours(GITHUB_CRON_UTC.hour, GITHUB_CRON_UTC.minute, 0, 0);
  if (next.getTime() <= now) next.setUTCDate(next.getUTCDate() + 1);
  const min = Math.round((next.getTime() - now) / 60_000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** A source counts as stale once it misses a daily sync. */
const isStale = (iso: string | null, now: number) => !iso || now - Date.parse(iso) > 36 * 3600_000;

/** When a source last synced: its newest listing, or for a source with no listings, its last successful run. */
const updatedAt = (s: SourceStat, fallback?: string | null) => s.lastScraped ?? (s.last?.ok ? s.last.at : null) ?? fallback ?? null;

/** Re-renders the server page (fresh data) every few seconds, faster while a sync is in progress. */
function useLiveRefresh(active: boolean) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setNow(Date.now());
    }, active ? 2_500 : 10_000);
    return () => clearInterval(id);
  }, [active, router]);
  return now;
}

// ───────── Page ─────────

export function SyncPanel({
  runs,
  workers,
  local,
  cloud,
  github,
}: {
  runs: SyncRun[];
  workers: SyncWorker[];
  local: SourceStat[];
  cloud: SourceStat[];
  github: GithubRun | null;
}) {
  const current = runs.find(isActiveRun) ?? null;
  const now = useLiveRefresh(Boolean(current));
  const worker = workers[0];
  const online = Boolean(worker && now - Date.parse(worker.last_seen) < WORKER_TIMEOUT_MS);
  const cloudPassedAt = github?.conclusion === "success" ? github.updated_at : null;

  return (
    <div className="space-y-6">
      <Summary local={local} cloud={cloud} cloudPassedAt={cloudPassedAt} online={online} now={now} />
      <LocalWorker sources={local} runs={runs} current={current} worker={worker} online={online} now={now} />
      <CloudSync sources={cloud} run={github} passedAt={cloudPassedAt} now={now} />
    </div>
  );
}

// ───────── Summary ─────────

function Summary({ local, cloud, cloudPassedAt, online, now }: { local: SourceStat[]; cloud: SourceStat[]; cloudPassedAt: string | null; online: boolean; now: number }) {
  const all = [...local, ...cloud];
  const jobs = all.filter((s) => s.kind === "jobs").reduce((n, s) => n + s.count, 0);
  const events = all.filter((s) => s.kind === "events").reduce((n, s) => n + s.count, 0);
  const added = all.reduce((n, s) => n + s.added, 0);
  const withNew = all.filter((s) => s.added > 0).length;
  const fresh = [...local.map((s) => updatedAt(s)), ...cloud.map((s) => updatedAt(s, cloudPassedAt))].filter((iso) => !isStale(iso, now)).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile icon={Layers} label="Live listings" value={(jobs + events).toLocaleString("en-IN")} hint={`${jobs.toLocaleString("en-IN")} jobs · ${events} events`} />
      <Tile icon={Sparkles} label="New today" value={added ? `+${added}` : "0"} tone={added ? "good" : "default"} hint={added ? `from ${withNew} source${withNew === 1 ? "" : "s"} in the last 24 h` : "nothing new in the last 24 h"} />
      <Tile
        icon={ShieldCheck}
        label="Sources up to date"
        value={`${fresh}/${all.length}`}
        tone={fresh === all.length ? "good" : "warn"}
        meter={fresh / all.length}
        hint={fresh === all.length ? "all synced in the last day" : `${all.length - fresh} need attention`}
      />
      <Tile icon={Clock} label="Next cloud sync" value={`in ${untilNextCloudSync(now)}`} hint={`Local worker ${online ? "online" : "offline"}`} />
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  meter,
}: {
  icon: typeof Cloud;
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "good" | "warn";
  meter?: number;
}) {
  const color = { default: "text-ink", good: "text-good", warn: "text-amber-600" }[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
        <Icon className="size-4 text-muted" strokeWidth={1.75} />
      </div>
      <p className={`mt-1.5 text-xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
      <p className="mt-0.5 truncate text-[12px] text-muted">{hint}</p>
      {meter !== undefined && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-line">
          <div className={`h-full ${tone === "warn" ? "bg-amber-500" : "bg-good"}`} style={{ width: `${meter * 100}%` }} />
        </div>
      )}
    </div>
  );
}

// ───────── Sections ─────────

function Section({
  icon: Icon,
  title,
  status,
  text,
  action,
  children,
}: {
  icon: typeof Cloud;
  title: string;
  status?: React.ReactNode;
  text: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <header className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">{title}</h2>
              {status}
            </div>
            <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-muted">{text}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function Pill({ tone, pulse, children }: { tone: "good" | "warn" | "bad" | "info"; pulse?: boolean; children: React.ReactNode }) {
  const styles = {
    good: ["border-good/25 bg-good/10 text-good", "bg-good"],
    warn: ["border-amber-200 bg-amber-50 text-amber-700", "bg-amber-500"],
    bad: ["border-red-200 bg-red-50 text-red-700", "bg-red-500"],
    info: ["border-sky-200 bg-sky-50 text-sky-700", "bg-sky-500"],
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[0]}`}>
      <span className="relative flex size-1.5">
        {pulse && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${styles[1]}`} />}
        <span className={`relative inline-flex size-1.5 rounded-full ${styles[1]}`} />
      </span>
      {children}
    </span>
  );
}

function LocalWorker({
  sources,
  runs,
  current,
  worker,
  online,
  now,
}: {
  sources: SourceStat[];
  runs: SyncRun[];
  current: SyncRun | null;
  worker?: SyncWorker;
  online: boolean;
  now: number;
}) {
  const targets = current ? runTargets(current) : [];
  const done = current?.results.length ?? 0;

  /** Row status: live progress during a run, otherwise the last worker result. */
  const rowStatus = (s: SourceStat) => {
    if (current && targets.includes(s.name)) {
      const result = current.results.find((r) => r.name === s.name);
      if (result) return <ResultMark result={result} text={result.ok ? `${result.found ?? 0} found` : result.unavailable ? `Site down · listings kept` : result.error} />;
      const first = targets.find((n) => !current.results.some((r) => r.name === n));
      return current.status === "running" && first === s.name ? (
        <span className="inline-flex items-center gap-1.5 text-sky-700">
          <Loader2 className="size-3.5 animate-spin" /> Syncing…
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <CircleDashed className="size-3.5" /> Waiting
        </span>
      );
    }
    return s.last ? (
      <ResultMark result={s.last} text={s.last.ok ? ago(s.last.at, now) : s.last.unavailable ? `Site down ${ago(s.last.at, now)} · listings kept` : s.last.error} />
    ) : (
      <span className="text-muted">—</span>
    );
  };

  return (
    <Section
      icon={Laptop}
      title="Local worker"
      status={
        <Pill tone={online ? "good" : "warn"} pulse={online}>
          {online ? `Online · ${worker!.id}` : worker ? `Offline · last seen ${ago(worker.last_seen, now)}` : "Not set up"}
        </Pill>
      }
      text={
        <>
          IndiGo and Fly91 block cloud servers, so the office machine syncs them. It does this by itself once a day while it&apos;s on; press Sync now
          for a fresh copy.{!online && " Requests wait in the queue until the worker is back online."}
        </>
      }
      action={
        current ? (
          <form action={cancelSync} className="flex items-center gap-3">
            <span className="text-[12.5px] text-muted tabular-nums">
              {current.status === "queued" ? "Waiting for worker…" : `${done}/${targets.length} · ${duration(current, now)}`}
            </span>
            <input type="hidden" name="id" value={current.id} />
            <SubmitButton variant="ghost">
              <Square className="size-3.5" /> Cancel
            </SubmitButton>
          </form>
        ) : (
          <ActionForm action={requestSync} className="flex flex-col items-start gap-2 sm:items-end">
            <SubmitButton>
              <RefreshCw className="size-4" /> Sync now
            </SubmitButton>
          </ActionForm>
        )
      }
    >
      <div className="h-1 bg-line">
        {current && <div className="h-full bg-good transition-all duration-500" style={{ width: `${(done / Math.max(targets.length, 1)) * 100}%` }} />}
      </div>
      <SourceTable sources={sources} now={now} status={rowStatus} statusLabel="Last worker sync" />
      <RecentRuns runs={runs} now={now} />
    </Section>
  );
}

/** ✓ synced, ⚠ the site was down (listings kept), ✗ the scraper failed. */
function ResultMark({ result, text }: { result: Pick<SyncResult, "ok" | "unavailable">; text: string }) {
  const tone = result.ok ? "text-ink-soft" : result.unavailable ? "text-amber-700" : "text-red-600";
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${tone}`} title={result.ok ? undefined : text}>
      {result.ok ? (
        <CheckCircle2 className="size-3.5 shrink-0 text-good" />
      ) : result.unavailable ? (
        <AlertTriangle className="size-3.5 shrink-0" />
      ) : (
        <XCircle className="size-3.5 shrink-0" />
      )}
      <span className="truncate">{text}</span>
    </span>
  );
}

function RecentRuns({ runs, now }: { runs: SyncRun[]; now: number }) {
  const finished = runs.filter((r) => !isActiveRun(r)).slice(0, 5);
  if (!finished.length) return null;
  const label = { queued: "Queued", running: "Running", done: "Done", failed: "Failed", cancelled: "Cancelled" };
  const dot = { queued: "bg-amber-500", running: "bg-sky-500", done: "bg-good", failed: "bg-red-500", cancelled: "bg-line" };
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[12.5px] text-muted transition hover:text-ink sm:px-5">
        <span className="flex items-center gap-2">
          Recent runs
          <span className="flex gap-1">
            {finished.map((r) => (
              <span key={r.id} title={label[r.status]} className={`size-1.5 rounded-full ${dot[r.status]}`} />
            ))}
          </span>
        </span>
        <ArrowDown className="size-3.5 transition group-open:rotate-180" />
      </summary>
      <ul className="divide-y divide-line border-t border-line text-[12.5px]">
        {finished.map((run) => {
          const ok = run.results.filter((r) => r.ok).length;
          const found = run.results.reduce((n, r) => n + (r.found ?? 0), 0);
          return (
            <li key={run.id}>
              <details className="px-4 py-2.5 sm:px-5">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className={`size-2 rounded-full ${dot[run.status]}`} />
                  <span className="font-medium text-ink">{label[run.status]}</span>
                  <span className="text-ink-soft">
                    {ok}/{runTargets(run).length} sources · {found} listings
                  </span>
                  <span className="text-muted">
                    {run.trigger === "schedule" ? "Daily auto-sync" : run.requester?.full_name ?? "Staff"} · {ago(run.created_at, now)}
                    {duration(run, now) && ` · ${duration(run, now)}`}
                  </span>
                </summary>
                {run.log && <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-ink p-3 text-[11.5px] leading-relaxed text-white/85">{run.log}</pre>}
              </details>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

type Filter = "all" | "jobs" | "events" | "new" | "stale";
type Sort = "listings" | "new" | "updated" | "name";

function CloudSync({ sources, run, passedAt, now }: { sources: SourceStat[]; run: GithubRun | null; passedAt: string | null; now: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  // Any change to what's listed starts again from the first page.
  const refine = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  const stale = sources.filter((s) => isStale(updatedAt(s, passedAt), now));
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: sources.length },
    { key: "jobs", label: "Jobs", count: sources.filter((s) => s.kind === "jobs").length },
    { key: "events", label: "Events", count: sources.filter((s) => s.kind === "events").length },
    { key: "new", label: "New today", count: sources.filter((s) => s.added > 0).length },
    ...(stale.length ? [{ key: "stale" as const, label: "Stale", count: stale.length }] : []),
  ];

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = sources.filter(
      (s) =>
        (!term || s.label.toLowerCase().includes(term)) &&
        (filter === "all" ||
          (filter === "jobs" && s.kind === "jobs") ||
          (filter === "events" && s.kind === "events") ||
          (filter === "new" && s.added > 0) ||
          (filter === "stale" && isStale(updatedAt(s, passedAt), now))),
    );
    const by: Record<Sort, (a: SourceStat, b: SourceStat) => number> = {
      listings: (a, b) => b.count - a.count,
      new: (a, b) => b.added - a.added || b.count - a.count,
      updated: (a, b) => Date.parse(updatedAt(b, passedAt) ?? "0") - Date.parse(updatedAt(a, passedAt) ?? "0"),
      name: (a, b) => a.label.localeCompare(b.label),
    };
    return rows.sort(by[sort]);
  }, [sources, filter, sort, q, passedAt, now]);

  const runPill = !run ? null : run.status !== "completed" ? (
    <Pill tone="info" pulse>
      Running now
    </Pill>
  ) : run.conclusion === "success" ? (
    <Pill tone="good">Last run passed · {ago(run.updated_at, now)}</Pill>
  ) : (
    <Pill tone="bad">Last run failed · {ago(run.updated_at, now)}</Pill>
  );

  return (
    <Section
      icon={Cloud}
      title="Daily cloud sync"
      status={runPill}
      text={
        <>
          {GITHUB_SCHEDULE}, GitHub Actions refreshes these {sources.length} sources, adds new openings and removes the ones airlines have closed. Nothing to
          do here.
          {stale.length > 0 && <span className="text-amber-700"> {stale.length} source{stale.length === 1 ? " hasn't" : "s haven't"} updated in over a day.</span>}
        </>
      }
      action={
        <a
          href={run?.html_url ?? `https://github.com/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/30 hover:bg-mist"
        >
          View on GitHub <ExternalLink className="size-3.5" />
        </a>
      }
    >
      <div className="flex flex-col gap-3 border-y border-line bg-mist/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => refine(setFilter)(f.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition ${
                filter === f.key ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink/25 hover:text-ink"
              }`}
            >
              {f.label}
              <span className={`text-[11px] tabular-nums ${filter === f.key ? "text-white/70" : "text-muted"}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <label className="relative block sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => refine(setQ)(e.target.value)}
            placeholder="Search airlines"
            className="h-8 w-full rounded-full border border-line bg-white pr-3 pl-8 text-[12.5px] text-ink outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
          />
        </label>
      </div>
      {shown.length ? (
        <>
          <SourceTable
            sources={shown.slice((Math.min(page, pageCount(shown.length)) - 1) * PAGE_SIZE, Math.min(page, pageCount(shown.length)) * PAGE_SIZE)}
            now={now}
            fallback={passedAt}
            sort={sort}
            onSort={refine(setSort)}
          />
          <Pager page={Math.min(page, pageCount(shown.length))} total={shown.length} onPage={setPage} />
        </>
      ) : (
        <p className="px-5 py-10 text-center text-sm text-muted">No sources match.</p>
      )}
    </Section>
  );
}

// ───────── Pagination ─────────

const PAGE_SIZE = 8;
const pageCount = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

/** "Showing 1–8 of 18" with previous/next and page numbers, for a list paged in the browser. */
function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  const pages = pageCount(total);
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const arrow = "flex size-8 items-center justify-center rounded-full border border-line text-ink-soft transition enabled:hover:border-ink/25 enabled:hover:bg-mist enabled:hover:text-ink disabled:opacity-40";
  return (
    <nav aria-label="Sources pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
      <p className="text-[13px] text-muted">
        Showing <span className="font-medium text-ink">{first}</span>–<span className="font-medium text-ink">{last}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className={arrow} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[13px] tabular-nums transition ${
                p === page ? "bg-ink font-medium text-white" : "text-ink-soft hover:bg-mist hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
          <button type="button" className={arrow} disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </nav>
  );
}

// ───────── Source table ─────────

/** Two-letter airline monogram with a stable colour per airline. */
function Monogram({ label }: { label: string }) {
  const letters = label.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const text = (letters.length > 1 ? letters[0][0] + letters[1][0] : label.slice(0, 2)).toUpperCase();
  const hues = ["bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-orange-100 text-orange-700", "bg-teal-100 text-teal-700"];
  const hue = hues[[...label].reduce((n, c) => n + c.charCodeAt(0), 0) % hues.length];
  return <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${hue}`}>{text}</span>;
}

/** Column header; sortable when given `by` and `onSort`. */
function Head({ label, by, right, sort, onSort }: { label: string; by?: Sort; right?: boolean; sort?: Sort; onSort?: (sort: Sort) => void }) {
  return (
    <th className={`px-3 py-2.5 font-semibold first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5 ${right ? "text-right" : ""}`}>
      {by && onSort ? (
        <button type="button" onClick={() => onSort(by)} className={`inline-flex items-center gap-1 uppercase transition hover:text-ink ${sort === by ? "text-ink" : ""}`}>
          {label}
          {sort === by && <ArrowDown className="size-3" />}
        </button>
      ) : (
        label
      )}
    </th>
  );
}

function SourceTable({
  sources,
  now,
  fallback,
  status,
  statusLabel,
  sort,
  onSort,
}: {
  sources: SourceStat[];
  now: number;
  fallback?: string | null;
  status?: (s: SourceStat) => React.ReactNode;
  statusLabel?: string;
  sort?: Sort;
  onSort?: (sort: Sort) => void;
}) {
  const max = Math.max(1, ...sources.map((s) => s.count));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] tracking-[0.1em] text-muted uppercase">
            <Head label="Source" by="name" sort={sort} onSort={onSort} />
            <Head label="Listings" by="listings" sort={sort} onSort={onSort} />
            <Head label="New today" by="new" right sort={sort} onSort={onSort} />
            <Head label="Updated" by="updated" sort={sort} onSort={onSort} />
            {status && <Head label={statusLabel ?? "Status"} />}
            <th className="w-10 pr-4 sm:pr-5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sources.map((s) => {
            const updated = updatedAt(s, fallback);
            return (
              <tr key={s.name} className="group transition hover:bg-mist/50">
                <td className="py-2.5 pr-3 pl-4 sm:pl-5">
                  <div className="flex items-center gap-3">
                    <Monogram label={s.label} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{s.label}</p>
                      <p className="text-[11.5px] text-muted">{s.kind === "events" ? "Hiring events" : "Job openings"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 text-right tabular-nums text-ink">{s.count}</span>
                    <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-line sm:block">
                      <span className="block h-full rounded-full bg-ink/70" style={{ width: `${(s.count / max) * 100}%` }} />
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {s.added > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-good/10 px-2 py-0.5 text-[12px] font-medium tabular-nums text-good">+{s.added}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className={`px-3 py-2.5 whitespace-nowrap ${isStale(updated, now) ? "text-amber-700" : "text-ink-soft"}`}>{ago(updated, now)}</td>
                {status && <td className="max-w-[14rem] px-3 py-2.5">{status(s)}</td>}
                <td className="py-2.5 pr-4 text-right sm:pr-5">
                  <Link
                    href={`/admin/jobs?source=${jobsFilterKey(s.name)}`}
                    title={`View ${s.label} listings`}
                    aria-label={`View ${s.label} listings`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted transition group-hover:bg-white group-hover:text-ink hover:border-line"
                  >
                    <ArrowUpRight className="size-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
