// Shared plumbing for the per-airline job scrapers in this folder.
// Each scraper exports nothing — it calls `runScraper()` with its own source key, table and scrape function.
//
//   node --env-file=.env.local scripts/scrapers/emirates.mjs            → scrape and save to Supabase
//   node scripts/scrapers/emirates.mjs --dry-run                         → scrape and print, no database
import { createClient } from "@supabase/supabase-js";

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** fetch() with a browser user agent, a timeout and a couple of retries. Throws on non-2xx. */
export async function request(url, { retries = 2, timeout = 30_000, headers, ...init } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "user-agent": USER_AGENT, "accept-language": "en-US,en;q=0.9", ...headers },
        signal: AbortSignal.timeout(timeout),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return res;
    } catch (error) {
      if (attempt >= retries) throw error;
      await sleep(1500 * (attempt + 1));
    }
  }
}

export const fetchText = async (url, init) => (await request(url, init)).text();
export const fetchJson = async (url, init) =>
  (await request(url, { ...init, headers: { accept: "application/json", ...init?.headers } })).json();

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘" };

/** Decodes the common HTML entities (named, decimal and hex). */
export function decodeEntities(text = "") {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** HTML → single-line plain text. */
export function stripHtml(html = "") {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|li|div|h\d)>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Trims to a short teaser for the job card. */
export function summarize(text, max = 400) {
  const clean = stripHtml(text ?? "");
  if (!clean) return null;
  return clean.length <= max ? clean : `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/** Any date-ish value → "YYYY-MM-DD", or null when it can't be parsed. */
export function toDate(value) {
  if (value == null || value === "") return null;
  const date = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export const absoluteUrl = (href, base) => new URL(decodeEntities(href), base).href;

/**
 * Saves one run: upserts `rows` into `table` (keyed on url), then deletes rows the site no longer lists.
 * Staff "hide" flags (is_active) survive re-scrapes because rows never carry that column.
 */
async function save({ source, table, rows, started, allowEmpty, noun }) {
  console.log(`[${source}] found ${rows.length} ${noun}`);
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify(rows, null, 2));
    return rows;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (or pass --dry-run)");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  // A run that finds nothing is far more likely a site change or block than everything closing at once,
  // so keep the existing listings and fail loudly instead.
  if (rows.length === 0 && !allowEmpty) throw new Error(`[${source}] scraped 0 ${noun} — leaving ${table} untouched`);

  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "url" });
    if (error) throw new Error(`[${source}] upsert failed: ${error.message}`);
  }

  const { count, error: pruneError } = await supabase.from(table).delete({ count: "exact" }).lt("scraped_at", started);
  if (pruneError) throw new Error(`[${source}] prune failed: ${pruneError.message}`);

  console.log(`[${source}] saved ${rows.length}, removed ${count ?? 0} closed listings`);
  return rows;
}

/** Job ads that are really hiring events ("Open Day Karachi", "Walk-in Drive", "Cabin Crew Recruitment | Novi Sad"). */
export const EVENT_TITLE =
  /walk[\s-]?ins?\b|(?:hiring|recruitment|interview|online) (?:drive|event|day)s?\b|virtual interviews?|open (?:day|house)|assessment day|recruitment\s*\||roadshow|career fair/i;

/**
 * Runs one job scraper. scrape() returns [{ title, url, location?, description?, posted_at? }].
 * Set `allowEmpty` for sites that often list nothing (e.g. only a general application form), so an empty run
 * clears the table instead of failing. Set `skipEvents` when that airline's events worker also collects its
 * event-style job ads, so those show only on the Hiring events page.
 */
export async function runScraper({ source, table, company, scrape, allowEmpty = false, skipEvents = false }) {
  const started = new Date().toISOString();
  console.log(`[${source}] scraping…`);

  const seen = new Set();
  const rows = [];
  for (const job of await scrape()) {
    const title = stripHtml(job.title ?? "");
    if (!title || !job.url || seen.has(job.url) || (skipEvents && EVENT_TITLE.test(title))) continue;
    seen.add(job.url);
    rows.push({
      title,
      company: job.company ?? company,
      url: job.url,
      location: job.location ? stripHtml(job.location) || null : null,
      description: job.description ? summarize(job.description, 1500) : null, // cards clamp it; the detail page shows it all
      posted_at: toDate(job.posted_at),
      scraped_at: started,
    });
  }
  return save({ source, table, rows, started, allowEmpty, noun: "jobs" });
}

export const EVENT_TYPES = ["walk_in", "open_day", "interview", "online_drive", "other"];

/**
 * Runs one hiring-event scraper. scrape() returns
 * [{ title, url, event_type, city?, country?, venue?, event_date?, event_time?, role?, description?, apply_url? }].
 * `url` must be unique per event (add a #fragment if events share a page). Events dated before today are dropped.
 * Events come and go, so an empty run is allowed by default.
 */
export async function runEventScraper({ source, table, brand, scrape, allowEmpty = true }) {
  const started = new Date().toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); // most events are in India
  console.log(`[${source}] scraping…`);

  const clean = (value, max = 300) => (value ? stripHtml(String(value)).slice(0, max) || null : null);
  const seen = new Set();
  const rows = [];
  for (const event of await scrape()) {
    const title = stripHtml(event.title ?? "");
    const eventDate = toDate(event.event_date);
    if (!title || !event.url || seen.has(event.url) || (eventDate && eventDate < today)) continue;
    seen.add(event.url);
    rows.push({
      title,
      brand: event.brand ?? brand,
      url: event.url,
      event_type: EVENT_TYPES.includes(event.event_type) ? event.event_type : "other",
      city: clean(event.city, 120),
      country: clean(event.country, 120),
      venue: clean(event.venue),
      event_date: eventDate,
      event_time: clean(event.event_time, 120),
      role: clean(event.role, 120),
      description: event.description ? summarize(event.description, 1500) : null,
      apply_url: event.apply_url ?? null,
      scraped_at: started,
    });
  }
  return save({ source, table, rows, started, allowEmpty, noun: "events" });
}

async function exitOnError(run) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/** Entry points so each scraper file can `await main(...)` / `await mainEvents(...)` and exit non-zero on failure. */
export const main = (options) => exitOnError(() => runScraper(options));
export const mainEvents = (options) => exitOnError(() => runEventScraper(options));
