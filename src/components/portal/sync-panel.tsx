"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, Cloud, ExternalLink, Laptop, Loader2, RefreshCw, Square, XCircle } from "lucide-react";
import { cancelSync, requestSync } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/portal/form";
import { Badge } from "@/components/portal/ui";
import {
  GITHUB_REPO,
  GITHUB_SCHEDULE,
  GITHUB_WORKFLOW,
  isActiveRun,
  runTargets,
  WORKER_TIMEOUT_MS,
  type GithubRun,
  type SourceStat,
  type SyncRun,
  type SyncWorker,
} from "@/lib/sync";

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
  return (
    <div className="space-y-6">
      <LocalWorker sources={local} runs={runs} current={current} worker={workers[0]} now={now} />
      <GithubSync sources={cloud} run={github} now={now} />
    </div>
  );
}

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
    <section className="rounded-2xl border border-line bg-white">
      <header className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-mist text-ink">
            <Icon className="size-4.5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-semibold tracking-tight text-ink">{title}</h2>
              {status}
            </div>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">{text}</p>
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

// ───────── Local worker ─────────

function LocalWorker({ sources, runs, current, worker, now }: { sources: SourceStat[]; runs: SyncRun[]; current: SyncRun | null; worker?: SyncWorker; now: number }) {
  const online = Boolean(worker && now - Date.parse(worker.last_seen) < WORKER_TIMEOUT_MS);
  const targets = current ? runTargets(current) : [];
  const done = current?.results.length ?? 0;

  /** Row status: live progress during a run, otherwise the last worker result. */
  const rowStatus = (s: SourceStat) => {
    if (current && targets.includes(s.name)) {
      const result = current.results.find((r) => r.name === s.name);
      if (result) return <ResultMark ok={result.ok} text={result.ok ? `${result.found ?? 0} found` : result.error} />;
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
    return s.last ? <ResultMark ok={s.last.ok} text={s.last.ok ? ago(s.last.at, now) : s.last.error} /> : <span className="text-muted">—</span>;
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
            <span className="text-[13px] text-muted">
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
      {current && (
        <div className="h-1 bg-line">
          <div className="h-full bg-good transition-all duration-500" style={{ width: `${(done / Math.max(targets.length, 1)) * 100}%` }} />
        </div>
      )}
      <SourceRows sources={sources} now={now} status={rowStatus} statusLabel="Last worker sync" />
      <RecentRuns runs={runs} now={now} />
    </Section>
  );
}

function ResultMark({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${ok ? "text-ink-soft" : "text-red-600"}`} title={ok ? undefined : text}>
      {ok ? <CheckCircle2 className="size-3.5 shrink-0 text-good" /> : <XCircle className="size-3.5 shrink-0" />}
      <span className="truncate">{text}</span>
    </span>
  );
}

function RecentRuns({ runs, now }: { runs: SyncRun[]; now: number }) {
  const finished = runs.filter((r) => !isActiveRun(r)).slice(0, 5);
  if (!finished.length) return null;
  const label = { queued: "Queued", running: "Running", done: "Done", failed: "Failed", cancelled: "Cancelled" };
  const tone = { queued: "text-amber-700", running: "text-sky-700", done: "text-good", failed: "text-red-600", cancelled: "text-muted" };
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] text-muted transition hover:text-ink sm:px-5">
        Recent runs
        <span className="text-xs transition group-open:rotate-180">▾</span>
      </summary>
      <ul className="divide-y divide-line border-t border-line text-[13px]">
        {finished.map((run) => {
          const ok = run.results.filter((r) => r.ok).length;
          return (
            <li key={run.id}>
              <details className="px-4 py-2.5 sm:px-5">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className={`font-medium ${tone[run.status]}`}>{label[run.status]}</span>
                  <span className="text-ink-soft">
                    {ok}/{runTargets(run).length} sources
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

// ───────── GitHub ─────────

function GithubSync({ sources, run, now }: { sources: SourceStat[]; run: GithubRun | null; now: number }) {
  const passedAt = run?.conclusion === "success" ? run.updated_at : null;
  const stale = sources.filter((s) => isStale(updatedAt(s, passedAt), now)).length;
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
          {GITHUB_SCHEDULE}, GitHub Actions refreshes these {sources.length} sources and removes listings the airlines have closed. Nothing to do here.
          {stale > 0 && <span className="text-amber-700"> {stale} source{stale === 1 ? " hasn't" : "s haven't"} updated in over a day.</span>}
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
      <SourceRows sources={sources} now={now} fallback={passedAt} />
    </Section>
  );
}

// ───────── Shared ─────────

function SourceRows({
  sources,
  now,
  status,
  statusLabel,
  fallback,
}: {
  sources: SourceStat[];
  now: number;
  fallback?: string | null;
  status?: (s: SourceStat) => React.ReactNode;
  statusLabel?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
            <th className="px-4 py-2.5 font-semibold sm:px-5">Source</th>
            <th className="px-3 py-2.5 text-right font-semibold">Listings</th>
            <th className="px-3 py-2.5 font-semibold">Updated</th>
            {status && <th className="px-4 py-2.5 font-semibold sm:px-5">{statusLabel}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sources.map((s) => (
            <tr key={s.name} className="transition hover:bg-mist/50">
              <td className="px-4 py-2.5 sm:px-5">
                <span className="text-ink">{s.label}</span>{" "}
                <Badge tone={s.kind === "events" ? "brand" : "default"}>{s.kind === "events" ? "Events" : "Jobs"}</Badge>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-ink">{s.count}</td>
              <td className={`px-3 py-2.5 whitespace-nowrap ${isStale(updatedAt(s, fallback), now) ? "text-amber-700" : "text-ink-soft"}`}>{ago(updatedAt(s, fallback), now)}</td>
              {status && <td className="max-w-[16rem] px-4 py-2.5 sm:px-5">{status(s)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

