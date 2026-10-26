// Runs every job and hiring-event scraper in this folder, one after another, and prints a summary.
// Each scraper runs in its own process, so one broken site never stops the others; exits 1 if any failed.
// worker.mjs imports syncAll() to run the syncs requested from the staff portal.
//
//   node --env-file=.env.local scripts/scrapers/sync-all.mjs            → scrape everything and save to Supabase
//   node scripts/scrapers/sync-all.mjs --dry-run                         → scrape and print counts, no database
//   node scripts/scrapers/sync-all.mjs emirates events/etihad            → only the named scrapers
//   node scripts/scrapers/sync-all.mjs --skip=fly91,events/etihad        → everything except the named scrapers
import { spawn } from "node:child_process";
import { appendFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(["lib", "sync-all", "worker"]);
const scripts = (dir) =>
  readdirSync(join(here, dir))
    .filter((f) => f.endsWith(".mjs") && !SKIP.has(f.slice(0, -4)))
    .map((f) => join(dir, f.slice(0, -4)));

/** Every scraper name: "emirates", …, "events/etihad", … */
export const allScrapers = () => [...scripts("."), ...scripts("events")].map((n) => n.replace(/^\.\//, ""));

/** Runs one scraper, passing each status line to onLine, and resolves with its exit code and log. */
function run(name, { flags = [], onLine, signal }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, `${name}.mjs`), ...flags], { env: process.env });
    let log = "";
    const pipe = (stream) =>
      stream.on("data", (chunk) => {
        log += chunk;
        // --dry-run dumps every row as JSON; keep the output to the status lines.
        for (const line of String(chunk).split("\n")) if (line.startsWith("[") && line.length > 1) onLine?.(line);
      });
    pipe(child.stdout);
    pipe(child.stderr);
    const kill = () => child.kill("SIGKILL");
    const timer = setTimeout(kill, 5 * 60_000);
    signal?.addEventListener("abort", kill);
    child.on("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", kill);
      resolve({ code: code ?? 1, log });
    });
  });
}

/**
 * Runs the named scrapers in turn and returns [{ name, ok, found, removed, seconds, error }].
 * onResult fires after each one; aborting `signal` kills the current scraper and skips the rest.
 */
export async function syncAll(targets, { flags = [], onLine, onResult, signal } = {}) {
  const results = [];
  for (const name of targets) {
    if (signal?.aborted) break;
    const started = Date.now();
    const { code, log } = await run(name, { flags, onLine, signal });
    const count = (re) => (log.match(re) ? Number(log.match(re)[1]) : null);
    const result = {
      name,
      ok: code === 0,
      found: count(/found (\d+)/),
      removed: count(/removed (\d+)/),
      seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
      error: code === 0 ? "" : signal?.aborted ? "Cancelled" : log.trim().split("\n").at(-1).slice(0, 200),
    };
    results.push(result);
    await onResult?.(result, results);
  }
  return results;
}

// ───────── CLI ─────────

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a === "--dry-run"); // passed through to each scraper
  const skip = args.find((a) => a.startsWith("--skip="))?.slice(7).split(",") ?? [];
  const only = args.filter((a) => !a.startsWith("--"));
  const all = allScrapers();
  const targets = (only.length ? all.filter((n) => only.includes(n)) : all).filter((n) => !skip.includes(n));

  const results = await syncAll(targets, { flags, onLine: (line) => console.log(line) });
  const failed = results.filter((r) => !r.ok);
  const show = (v) => v ?? "–";
  console.log(`\nSynced ${results.length - failed.length}/${results.length} sources`);
  console.table(results.map(({ name, ok, found, removed, seconds }) => ({ name, ok, found: show(found), removed: show(removed), seconds })));
  for (const r of failed) console.error(`✗ ${r.name}: ${r.error}`);

  // On GitHub Actions, also write the summary to the run page.
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results.map((r) => `| ${r.ok ? "✅" : "❌"} | ${r.name} | ${show(r.found)} | ${show(r.removed)} | ${r.error.replace(/\|/g, "\\|")} |`);
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [`### Synced ${results.length - failed.length}/${results.length} sources`, "", "| | Source | Found | Removed | Error |", "|---|---|---|---|---|", ...rows, ""].join("\n"),
    );
  }

  process.exit(failed.length ? 1 : 0);
}
