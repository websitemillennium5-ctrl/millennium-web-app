"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, Loader2, Square, XCircle } from "lucide-react";
import { cancelSync, requestSync } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/portal/form";
import { Badge, Card, Empty } from "@/components/portal/ui";
import {
  isActiveRun,
  localOnlyScrapers,
  runTargets,
  scraperLabel,
  scrapers,
  WORKER_TIMEOUT_MS,
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

const statusStyle: Record<SyncRun["status"], string> = {
  queued: "border-amber-200 bg-amber-50 text-amber-700",
  running: "border-sky-200 bg-sky-50 text-sky-700",
  done: "border-good/20 bg-good/10 text-good",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-line bg-mist text-ink-soft",
};

function StatusBadge({ run }: { run: SyncRun }) {
  const label = { queued: "Queued", running: "Running", done: "Done", failed: "Some failed", cancelled: "Cancelled" }[run.status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${statusStyle[run.status]}`}>
      {run.status === "running" && <Loader2 className="size-3 animate-spin" />}
      {label}
    </span>
  );
}

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

export function SyncPanel({ runs, workers, sources }: { runs: SyncRun[]; workers: SyncWorker[]; sources: SourceStat[] }) {
  const current = runs.find(isActiveRun) ?? null;
  const now = useLiveRefresh(Boolean(current));
  const latest = current ?? runs[0] ?? null;

  return (
    <div className="space-y-5">
      <WorkerStatus workers={workers} now={now} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <RunForm busy={Boolean(current)} />
        {latest ? <RunCard run={latest} now={now} /> : <Card title="Latest sync"><Empty>No syncs yet. Pick sources and press Sync.</Empty></Card>}
      </div>
      <SourceTable sources={sources} now={now} />
      <History runs={runs} now={now} />
    </div>
  );
}

function WorkerStatus({ workers, now }: { workers: SyncWorker[]; now: number }) {
  const worker = workers[0];
  const online = worker && now - Date.parse(worker.last_seen) < WORKER_TIMEOUT_MS;
  return (
    <div className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${online ? "border-good/25 bg-good/5" : "border-amber-200 bg-amber-50/70"}`}>
      <p className="flex items-center gap-2.5 text-sm text-ink">
        <span className={`relative flex size-2.5 ${online ? "" : "opacity-70"}`}>
          {online && <span className="absolute inline-flex size-full animate-ping rounded-full bg-good opacity-50" />}
          <span className={`relative inline-flex size-2.5 rounded-full ${online ? "bg-good" : "bg-amber-500"}`} />
        </span>
        <span className="font-medium">{online ? "Worker online" : "Worker offline"}</span>
        {worker && <span className="text-muted">· {worker.id} · checked in {ago(worker.last_seen, now)}</span>}
      </p>
      {!online && (
        <p className="text-[13px] text-ink-soft">
          Syncs stay queued until the worker machine is on. Start it there with <code className="rounded bg-white px-1 py-0.5 text-xs">npm run worker</code>.
        </p>
      )}
    </div>
  );
}

function RunForm({ busy }: { busy: boolean }) {
  const all = scrapers.map((s) => s.name);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(all));
  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const presets = [
    { label: "All", names: all },
    { label: "Jobs", names: scrapers.filter((s) => s.kind === "jobs").map((s) => s.name) },
    { label: "Hiring events", names: scrapers.filter((s) => s.kind === "events").map((s) => s.name) },
    { label: "IndiGo & Fly91", names: localOnlyScrapers },
  ];
  const isPreset = (names: string[]) => names.length === selected.size && names.every((n) => selected.has(n));

  return (
    <Card title="Run a sync">
      <ActionForm action={requestSync} className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setSelected(new Set(p.names))}
              className={`rounded-full border px-3 py-1 text-[13px] transition ${isPreset(p.names) ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink/25 hover:text-ink"}`}
            >
              {p.label}
            </button>
          ))}
          <button type="button" onClick={() => setSelected(new Set())} className="rounded-full px-3 py-1 text-[13px] text-muted transition hover:text-ink">
            Clear
          </button>
        </div>

        {(["jobs", "events"] as const).map((kind) => (
          <fieldset key={kind}>
            <legend className="mb-2 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">{kind === "jobs" ? "Job openings" : "Hiring events"}</legend>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {scrapers
                .filter((s) => s.kind === kind)
                .map((s) => (
                  <label
                    key={s.name}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition ${selected.has(s.name) ? "border-ink/25 bg-mist text-ink" : "border-line text-ink-soft hover:border-ink/20"}`}
                  >
                    <input type="checkbox" name="source" value={s.name} checked={selected.has(s.name)} onChange={() => toggle(s.name)} className="size-4 accent-[var(--color-ink)]" />
                    <span className="truncate">{s.label}</span>
                    {localOnlyScrapers.includes(s.name) && <span className="ml-auto shrink-0 text-[11px] text-muted">local only</span>}
                  </label>
                ))}
            </div>
          </fieldset>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          {busy ? (
            <p className="text-sm text-muted">A sync is in progress. You can queue another once it finishes.</p>
          ) : (
            <SubmitButton>Sync {selected.size === all.length ? "all" : selected.size} source{selected.size === 1 ? "" : "s"}</SubmitButton>
          )}
        </div>
      </ActionForm>
    </Card>
  );
}

function RunCard({ run, now }: { run: SyncRun; now: number }) {
  const targets = runTargets(run);
  const done = run.results.length;
  const failed = run.results.filter((r) => !r.ok).length;
  const active = isActiveRun(run);
  const pending = targets.filter((name) => !run.results.some((r) => r.name === name));

  return (
    <Card
      title={active ? "Sync in progress" : "Latest sync"}
      action={
        active && (
          <form action={cancelSync}>
            <input type="hidden" name="id" value={run.id} />
            <SubmitButton variant="ghost">
              <Square className="size-3.5" /> Cancel
            </SubmitButton>
          </form>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <StatusBadge run={run} />
        <span>
          {done}/{targets.length} sources{failed > 0 && <span className="text-red-600"> · {failed} failed</span>}
        </span>
        <span>· {run.trigger === "schedule" ? "Daily auto-sync" : `by ${run.requester?.full_name ?? "staff"}`}</span>
        <span>· {ago(run.created_at, now)}</span>
        {duration(run, now) && <span>· {duration(run, now)}</span>}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full transition-all duration-500 ${failed ? "bg-amber-500" : "bg-good"}`} style={{ width: `${(done / Math.max(targets.length, 1)) * 100}%` }} />
      </div>

      {run.status === "queued" && <p className="mt-3 text-sm text-muted">Waiting for the worker to pick this up…</p>}

      <ul className="mt-4 max-h-72 divide-y divide-line overflow-y-auto text-sm">
        {run.results.map((r) => (
          <li key={r.name} className="flex items-center gap-2.5 py-2">
            {r.ok ? <CheckCircle2 className="size-4 shrink-0 text-good" /> : <XCircle className="size-4 shrink-0 text-red-600" />}
            <span className="min-w-0 flex-1 truncate text-ink">{scraperLabel(r.name)}</span>
            {r.ok ? (
              <span className="shrink-0 text-[13px] text-muted">
                {r.found ?? 0} found{r.removed ? ` · ${r.removed} removed` : ""}
              </span>
            ) : (
              <span className="min-w-0 max-w-[55%] shrink truncate text-[13px] text-red-600" title={r.error}>
                {r.error}
              </span>
            )}
          </li>
        ))}
        {active &&
          pending.map((name, i) => (
            <li key={name} className="flex items-center gap-2.5 py-2 text-muted">
              {i === 0 && run.status === "running" ? <Loader2 className="size-4 shrink-0 animate-spin text-sky-600" /> : <CircleDashed className="size-4 shrink-0" />}
              <span className="truncate">{scraperLabel(name)}</span>
            </li>
          ))}
      </ul>

      {run.log && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] text-muted hover:text-ink">Worker log</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-ink p-3 text-[11.5px] leading-relaxed text-white/85">{run.log}</pre>
        </details>
      )}
    </Card>
  );
}

function SourceTable({ sources, now }: { sources: SourceStat[]; now: number }) {
  const stale = (iso: string | null) => !iso || now - Date.parse(iso) > 36 * 3600_000;
  return (
    <Card title="Sources">
      <div className="-mx-4 overflow-x-auto sm:-mx-5">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-muted">
              <th className="px-4 py-2 font-medium sm:px-5">Source</th>
              <th className="px-3 py-2 text-right font-medium">Listings</th>
              <th className="px-3 py-2 font-medium">Last updated</th>
              <th className="px-4 py-2 font-medium sm:px-5">Last panel sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sources.map((s) => (
              <tr key={s.name}>
                <td className="px-4 py-2.5 sm:px-5">
                  <span className="text-ink">{s.label}</span> <Badge tone={s.kind === "events" ? "brand" : "default"}>{s.kind === "events" ? "events" : "jobs"}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink">{s.count}</td>
                <td className={`px-3 py-2.5 ${stale(s.lastScraped) ? "text-amber-700" : "text-ink-soft"}`}>{ago(s.lastScraped, now)}</td>
                <td className="px-4 py-2.5 sm:px-5">
                  {s.last ? (
                    <span className={`inline-flex items-center gap-1.5 ${s.last.ok ? "text-ink-soft" : "text-red-600"}`} title={s.last.error || undefined}>
                      {s.last.ok ? <CheckCircle2 className="size-3.5 text-good" /> : <XCircle className="size-3.5" />}
                      {ago(s.last.at, now)}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-muted">
        GitHub also refreshes every source except IndiGo and Fly91 each morning; the worker syncs those two daily by itself while its machine is on.
      </p>
    </Card>
  );
}

function History({ runs, now }: { runs: SyncRun[]; now: number }) {
  if (runs.length < 2) return null;
  return (
    <Card title="History">
      <ul className="divide-y divide-line text-sm">
        {runs.map((run) => {
          const targets = runTargets(run);
          const ok = run.results.filter((r) => r.ok).length;
          return (
            <li key={run.id}>
              <details className="group py-2.5">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge run={run} />
                  <span className="text-ink">
                    {run.sources ? (targets.length <= 3 ? targets.map(scraperLabel).join(", ") : `${targets.length} sources`) : "All sources"}
                  </span>
                  <span className="text-[13px] text-muted">
                    {ok}/{targets.length} ok · {run.trigger === "schedule" ? "auto" : run.requester?.full_name ?? "staff"} · {ago(run.created_at, now)}
                    {duration(run, now) && ` · ${duration(run, now)}`}
                  </span>
                </summary>
                {run.log && <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-ink p-3 text-[11.5px] leading-relaxed text-white/85">{run.log}</pre>}
              </details>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
