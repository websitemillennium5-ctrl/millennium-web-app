// BCD Travel (India): https://jobs.bcdtravel.com/search/?q=&locationsearch=India
// SAP SuccessFactors career site: server-rendered result rows (title, "IN, Mumbai, Office, India, APAC", date), 10 a page
// via ?startrow=N. Each job page carries the full description and a schema.org datePosted; rows under /bcdme/ belong to
// BCD Meetings & Events. The location search is a radius match, so rows are kept only when the location names India.
import { absoluteUrl, decodeEntities, fetchText, main, mapLimit } from "./lib.mjs";

const BASE = "https://jobs.bcdtravel.com";
const PAGE = 10;
const CONCURRENCY = 3;

/** "IN, Bangalore, Office (SSC), India, APAC" → "Bangalore, India"; "IN, India, Virtual, APAC" → "India (Virtual)". */
function cleanLocation(raw) {
  const parts = raw.split(/\s*,\s*/).filter((p) => p && !/^(IN|India|APAC)$/i.test(p));
  const city = parts.find((p) => !/office|onsite|on-site|virtual|remote|hybrid/i.test(p));
  const virtual = parts.some((p) => /virtual|remote/i.test(p));
  return `${city ? `${city}, ` : ""}India${virtual ? " (Virtual)" : ""}`;
}

/** The result rows of one search page → [{ title, url, location, posted_at, company }]. */
function parseRows(html) {
  const rows = [];
  for (const row of html.replace(/\s+/g, " ").split(/<tr class="data-row">/).slice(1)) {
    const link = row.match(/<a (?:href="([^"]+)" class="jobTitle-link"|class="jobTitle-link" href="([^"]+)")>\s*([^<]*?)\s*</);
    const location = row.match(/<span class="jobLocation">\s*([^<]*?)\s*<\/span>/)?.[1] ?? "";
    if (!link || !/\bindia\b|^IN,/i.test(location)) continue;
    const href = link[1] ?? link[2];
    rows.push({
      title: decodeEntities(link[3]),
      url: absoluteUrl(href, BASE),
      location: cleanLocation(location),
      posted_at: row.match(/<span class="jobDate">\s*([^<]*?)\s*</)?.[1],
      company: href.startsWith("/bcdme/") ? "BCD Meetings & Events" : undefined,
    });
  }
  return rows;
}

await main({
  source: "bcd_travel",
  table: "jobs_bcd_travel",
  company: "BCD Travel",
  async scrape() {
    const rows = [];
    for (let startrow = 0; startrow < 1000; startrow += PAGE) {
      const html = await fetchText(`${BASE}/search/?q=&locationsearch=India&locale=en_US&startrow=${startrow}`);
      const page = parseRows(html);
      rows.push(...page);
      const total = Number(html.match(/of <b>(\d+)<\/b>/)?.[1] ?? 0);
      if (!page.length || startrow + PAGE >= total) break;
    }

    return mapLimit(rows, CONCURRENCY, async (row) => {
      const html = await fetchText(row.url).catch(() => "");
      // Every posting opens with the same "Start your journey with BCD…" line, then repeats the title and the work setup
      const description = html
        .match(/<span class="jobdescription">([\s\S]*?)<\/span>\s*<\/span>/)?.[1]
        ?.replace(/^\s*<p>[^]*?Start your journey with BCD[^]*?<\/p>/, "")
        .trim();
      return {
        ...row,
        description: description || `at ${row.company ?? "BCD Travel"}, ${row.location}`,
        posted_at: html.match(/itemprop="datePosted" content="([^"]+)"/)?.[1] ?? row.posted_at,
      };
    });
  },
});
