// Fly91: https://fly91.in/careers
// Drupal site. As of Oct 2026 the careers page lists NO openings: it only has a general "Join Our Team" webform
// whose "Position Applied For" dropdown holds broad categories (Pilots, Cabin Crew, Engineering, Airport
// Operations, Corporate). No JSON/CMS endpoint or ATS (Zoho Recruit, Keka, Darwinbox) backs it. Best effort:
// pick up any per-job links that appear in the page body later; until then it returns 0 rows, which is
// expected (allowEmpty), so the worker succeeds and the table stays empty.
import { absoluteUrl, fetchText, main, stripHtml } from "./lib.mjs";

const CAREERS = "https://fly91.in/careers";

await main({
  source: "fly91",
  table: "jobs_fly91",
  company: "Fly91",
  allowEmpty: true,
  async scrape() {
    const html = await fetchText(CAREERS);
    const body = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
    return [...body.matchAll(/<a[^>]+href="([^"]*\/(?:careers|jobs?|openings?|vacanc[a-z]*)\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map(([, href, title]) => ({ title: stripHtml(title), url: absoluteUrl(href, CAREERS) }))
      .filter((job) => job.title);
  },
});
