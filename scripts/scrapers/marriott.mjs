// Marriott International (India): https://careers.marriott.com/jobs?filter[country][0]=India
// Paradox career site. Each search page embeds its 10 results as JSON in window.__PRELOAD_STATE__ (the JSON API behind
// it refuses non-browser clients), so the pages are read in parallel. Posting dates come from the site's job sitemaps,
// whose <lastmod> matches each job page's datePosted; the cards themselves carry no date or description.
import { fetchText, main, mapLimit, toDate } from "./lib.mjs";

const BASE = "https://careers.marriott.com";
const LIST = `${BASE}/jobs?filter%5Bcountry%5D%5B0%5D=India&sort_by=update_date`;
const PAGE_SIZE = 10;
const MAX_JOBS = 3000;
const CONCURRENCY = 4;

/** The JSON assigned to window.__PRELOAD_STATE__ (brace-matched, since the page has other scripts after it). */
function preloadState(html) {
  const start = html.indexOf("window.__PRELOAD_STATE__");
  const open = start < 0 ? -1 : html.indexOf("{", start);
  if (open < 0) throw new Error("no __PRELOAD_STATE__ on the page (site changed?)");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(html.slice(open, i + 1));
  }
  throw new Error("unterminated __PRELOAD_STATE__");
}

async function listPage(page) {
  const { jobSearch } = preloadState(await fetchText(`${LIST}&page_number=${page}`));
  return { total: jobSearch?.totalJob ?? 0, jobs: jobSearch?.jobs ?? [] };
}

/** url → "YYYY-MM-DD" from the English job sitemaps (a few MB in all). Failures just leave dates empty. */
async function sitemapDates() {
  const dates = new Map();
  try {
    const index = await fetchText(`${BASE}/sitemap.xml`);
    const children = [...index.matchAll(/<loc>([^<]+-en\.xml)<\/loc>/g)].map((m) => m[1]);
    const xmls = await mapLimit(children, CONCURRENCY, (url) => fetchText(url).catch(() => ""));
    for (const xml of xmls) {
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) dates.set(m[1], toDate(m[2]));
    }
  } catch (error) {
    console.error(`[marriott] sitemap unavailable, posting dates left empty: ${error.message}`);
  }
  return dates;
}

const field = (job, key) => job.customFields?.find((f) => f.cfKey === key)?.value || null;
const shortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null;

await main({
  source: "marriott",
  table: "jobs_marriott",
  company: "Marriott International",
  async scrape() {
    const [dates, first] = await Promise.all([sitemapDates(), listPage(1)]);
    const pages = Math.ceil(Math.min(first.total, MAX_JOBS) / PAGE_SIZE);
    const rest = await mapLimit(Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => i + 2), CONCURRENCY, listPage);
    const jobs = [first, ...rest].flatMap((p) => p.jobs);

    return jobs.map((job) => {
      const url = `${BASE}/${job.originalURL}`;
      const place = job.locations?.[0];
      const hotel = field(job, "cf_location_name");
      const brand = job.brandName && !/corporate|marriott international/i.test(job.brandName) ? job.brandName : "Marriott International";
      const closes = shortDate(field(job, "cf_publish_job_end_date"));
      return {
        title: job.title,
        url,
        company: brand,
        location: [...new Set([hotel, place?.city, place?.state].filter(Boolean))].join(", ") || place?.country,
        description: [
          field(job, "cf_jobfield"),
          field(job, "cf_position_type"),
          job.employmentType?.join(" / "),
          hotel && `at ${hotel}`,
          closes && `Apply by ${closes}`,
        ]
          .filter(Boolean)
          .join(" · "),
        posted_at: dates.get(url) ?? null,
      };
    });
  },
});
