// Local sync worker: runs the listing syncs requested from the staff portal (Jobs → Sync) on this machine and
// writes the results straight to Supabase. Runs here rather than on GitHub because IndiGo and Fly91 block
// datacenter IPs. Also queues a daily sync of AUTO_SOURCES by itself, so those stay fresh without anyone clicking.
//
//   node --env-file=.env.local scripts/scrapers/worker.mjs      → run in the foreground (npm run worker)
//   scripts/scrapers/install-worker.sh                          → keep it running in the background (macOS launchd)
import { hostname } from "node:os";
import { createClient } from "@supabase/supabase-js";
import { allScrapers, syncAll } from "./sync-all.mjs";

const AUTO_SOURCES = ["fly91", "events/indigo_cabin_crew", "events/indigo_ground_staff"];
const AUTO_EVERY = 24 * 3600_000;
const POLL = 4_000;
const HEARTBEAT = 10_000;
const MAX_LOG = 60_000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (run with --env-file=.env.local)");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const id = hostname().replace(/\.local$/, "");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stamp = () => new Date().toISOString().slice(11, 19);
let current = null; // the run being worked on

async function heartbeat() {
  const { error } = await supabase.from("sync_workers").upsert({ id, last_seen: new Date().toISOString(), run_id: current?.id ?? null });
  if (error) console.error(`[worker] heartbeat failed: ${error.message}`);
}

/** Queues the daily AUTO_SOURCES sync if the last one is a day old. */
async function scheduleDaily() {
  const { data } = await supabase
    .from("sync_runs")
    .select("created_at, status")
    .eq("trigger", "schedule")
    .order("created_at", { ascending: false })
    .limit(1);
  const last = data?.[0];
  if (last && (last.status === "queued" || last.status === "running" || Date.now() - Date.parse(last.created_at) < AUTO_EVERY)) return;
  await supabase.from("sync_runs").insert({ sources: AUTO_SOURCES, trigger: "schedule" });
  console.log(`[worker] queued the daily sync of ${AUTO_SOURCES.join(", ")}`);
}

/** Claims the oldest queued run, or returns null. The status filter makes the claim safe if two workers race. */
async function claim() {
  const { data: queued } = await supabase.from("sync_runs").select("id").eq("status", "queued").order("created_at").limit(1);
  if (!queued?.length) return null;
  const { data } = await supabase
    .from("sync_runs")
    .update({ status: "running", worker: id, started_at: new Date().toISOString() })
    .eq("id", queued[0].id)
    .eq("status", "queued")
    .select()
    .maybeSingle();
  return data;
}

async function execute(run) {
  current = run;
  await heartbeat();
  const known = allScrapers();
  const targets = run.sources?.length ? run.sources.filter((n) => known.includes(n)) : known;
  console.log(`[worker] run ${run.id}: ${targets.length} sources`);

  let log = `${stamp()} ${id} started ${targets.length} sources\n`;
  let dirty = true;
  const controller = new AbortController();
  const flush = async (extra = {}) => {
    if (log.length > MAX_LOG) log = `…\n${log.slice(-MAX_LOG)}`;
    const { data } = await supabase.from("sync_runs").update({ log, ...extra }).eq("id", run.id).select("status").single();
    dirty = false;
    // Staff pressed Cancel: stop the scraper that's running and skip the rest.
    if (data?.status === "cancelled" && !controller.signal.aborted) {
      log += `${stamp()} cancelled from the portal\n`;
      controller.abort();
    }
  };
  const ticker = setInterval(() => dirty || controller.signal.aborted || flush(), 2_500);
  ticker.unref();

  const results = await syncAll(targets, {
    signal: controller.signal,
    onLine: (line) => {
      console.log(line);
      log += `${stamp()} ${line}\n`;
      dirty = true;
    },
    onResult: (result, all) => {
      if (!result.ok) log += `${stamp()} ✗ ${result.name}: ${result.error}\n`;
      return flush({ results: all });
    },
  });
  clearInterval(ticker);

  const failed = results.filter((r) => !r.ok).length;
  log += `${stamp()} synced ${results.length - failed}/${targets.length} sources\n`;
  const status = controller.signal.aborted ? "cancelled" : failed ? "failed" : "done";
  await supabase.from("sync_runs").update({ status, log, results, finished_at: new Date().toISOString() }).eq("id", run.id);
  console.log(`[worker] run ${run.id} ${status}`);
  current = null;
  await heartbeat();
}

// A run this machine was working on when it last stopped (crash, sleep, restart) will never finish.
await supabase
  .from("sync_runs")
  .update({ status: "failed", finished_at: new Date().toISOString(), log: "Worker stopped before this run finished." })
  .eq("status", "running")
  .eq("worker", id);

console.log(`[worker] ${id} watching for syncs`);
await supabase.from("sync_workers").upsert({ id, started_at: new Date().toISOString(), last_seen: new Date().toISOString(), run_id: null });
setInterval(heartbeat, HEARTBEAT).unref();

let lastScheduleCheck = 0;
for (;;) {
  try {
    if (Date.now() - lastScheduleCheck > 10 * 60_000) {
      lastScheduleCheck = Date.now();
      await scheduleDaily();
    }
    const run = await claim();
    if (run) await execute(run);
    else await sleep(POLL);
  } catch (error) {
    console.error(`[worker] ${error instanceof Error ? error.message : error}`);
    current = null;
    await sleep(POLL * 3);
  }
}
