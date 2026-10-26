// Runs every job and hiring-event scraper in this folder, one after another, and prints a summary.
// Each scraper runs in its own process, so one broken site never stops the others; exits 1 if any failed.
//
//   node --env-file=.env.local scripts/scrapers/sync-all.mjs            → scrape everything and save to Supabase
//   node scripts/scrapers/sync-all.mjs --dry-run                         → scrape and print counts, no database
//   node scripts/scrapers/sync-all.mjs emirates events/etihad            → only the named scrapers
//   node scripts/scrapers/sync-all.mjs --skip=fly91,events/etihad        → everything except the named scrapers
import { spawn } from "node:child_process";
import { appendFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(["lib", "sync-all"]);
const scripts = (dir) =>
  readdirSync(join(here, dir))
    .filter((f) => f.endsWith(".mjs") && !SKIP.has(f.slice(0, -4)))
    .map((f) => join(dir, f.slice(0, -4)));

const args = process.argv.slice(2);
const flags = args.filter((a) => a === "--dry-run"); // passed through to each scraper
const skip = args.find((a) => a.startsWith("--skip="))?.slice(7).split(",") ?? [];
const only = args.filter((a) => !a.startsWith("--"));
const all = [...scripts("."), ...scripts("events")].map((n) => n.replace(/^\.\//, ""));
const targets = (only.length ? all.filter((n) => only.includes(n)) : all).filter((n) => !skip.includes(n));

/** Runs one scraper, streaming its output with a prefix, and resolves with its exit code and log. */
function run(name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, `${name}.mjs`), ...flags], { env: process.env });
    let log = "";
    const pipe = (stream, out) =>
      stream.on("data", (chunk) => {
        log += chunk;
        // --dry-run dumps every row as JSON; keep the console to the status lines.
        for (const line of String(chunk).split("\n")) if (line.startsWith("[") && line.length > 1) out.write(`${line}\n`);
      });
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);
    const timer = setTimeout(() => child.kill("SIGKILL"), 5 * 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, log });
    });
  });
}

const results = [];
for (const name of targets) {
  const started = Date.now();
  const { code, log } = await run(name);
  const found = log.match(/found (\d+)/)?.[1] ?? "–";
  const removed = log.match(/removed (\d+)/)?.[1] ?? "–";
  const error = code === 0 ? "" : log.trim().split("\n").at(-1).slice(0, 200);
  results.push({ name, ok: code === 0, found, removed, seconds: ((Date.now() - started) / 1000).toFixed(1), error });
}

const failed = results.filter((r) => !r.ok);
console.log(`\nSynced ${results.length - failed.length}/${results.length} sources`);
console.table(results.map(({ name, ok, found, removed, seconds }) => ({ name, ok, found, removed, seconds })));
for (const r of failed) console.error(`✗ ${r.name}: ${r.error}`);

// On GitHub Actions, also write the summary to the run page.
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map((r) => `| ${r.ok ? "✅" : "❌"} | ${r.name} | ${r.found} | ${r.removed} | ${r.error.replace(/\|/g, "\\|")} |`);
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [`### Synced ${results.length - failed.length}/${results.length} sources`, "", "| | Source | Found | Removed | Error |", "|---|---|---|---|---|", ...rows, ""].join("\n"),
  );
}

process.exit(failed.length ? 1 : 0);
