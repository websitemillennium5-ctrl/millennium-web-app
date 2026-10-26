import { eventSources, jobSources, type EventSource, type JobSource } from "@/lib/job-sources";

/**
 * Scrapers the local worker can run (scripts/scrapers/<name>.mjs), named the way sync-all.mjs names them:
 * "emirates" for jobs, "events/etihad" for hiring events.
 */
export type Scraper = { name: string; label: string; kind: "jobs" | "events"; table: string };

const eventLabels: Partial<Record<EventSource, string>> = {
  indigo_cabin_crew: "IndiGo cabin crew",
  indigo_ground_staff: "IndiGo ground staff",
};

export const scrapers: Scraper[] = [
  ...(Object.keys(jobSources) as JobSource[]).map((key) => ({ name: key, label: jobSources[key], kind: "jobs" as const, table: `jobs_${key}` })),
  ...(Object.keys(eventSources) as EventSource[]).map((key) => ({
    name: `events/${key}`,
    label: eventLabels[key] ?? eventSources[key],
    kind: "events" as const,
    table: `events_${key}`,
  })),
];

export const scraperLabel = (name: string) => {
  const s = scrapers.find((x) => x.name === name);
  return s ? `${s.label}${s.kind === "events" ? " events" : " jobs"}` : name;
};

/** Sites that block GitHub's datacenter IPs, so only the local worker can reach them (also its daily auto-sync). */
export const localOnlyScrapers = ["fly91", "events/indigo_cabin_crew", "events/indigo_ground_staff"];

export type SyncResult = { name: string; ok: boolean; found: number | null; removed: number | null; seconds: number; error: string };

export type SyncRun = {
  id: string;
  sources: string[] | null;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  trigger: "panel" | "schedule";
  worker: string | null;
  results: SyncResult[];
  log: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  requester: { full_name: string } | null;
};

export type SyncWorker = { id: string; last_seen: string; started_at: string; run_id: string | null };

export type SourceStat = Scraper & { count: number; lastScraped: string | null; last: (SyncResult & { at: string }) | null };

/** The worker checks in every 10 seconds; treat it as offline after a few missed check-ins. */
export const WORKER_TIMEOUT_MS = 45_000;

export const isActiveRun = (run: SyncRun) => run.status === "queued" || run.status === "running";

export const runTargets = (run: SyncRun) => run.sources ?? scrapers.map((s) => s.name);
