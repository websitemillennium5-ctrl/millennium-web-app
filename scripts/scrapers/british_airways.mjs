// british_airways: https://careers.ba.com/search-jobs (filtered: Category = Cabin Crew, Country = United Kingdom)
// A Radancy TalentBrew site that server-renders the results; we page the HTML list (&p=N) and, when the list is
// short, read each job page's JSON-LD JobPosting for the description and datePosted.
import { absoluteUrl, decodeEntities, fetchText, main, stripHtml } from "./lib.mjs";

const BASE = "https://careers.ba.com";
const SEARCH = `${BASE}/search-jobs?acm=57442&alrpm=2635167&ascf=[%7B%22key%22:%22ALL%22,%22value%22:%22%22%7D]`;
const MAX_DETAIL_PAGES = 40;

function jobPosting(html) {
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(json);
      if (data["@type"] === "JobPosting") return data;
    } catch {}
  }
  return null;
}

await main({
  source: "british_airways",
  table: "jobs_british_airways",
  company: "British Airways",
  async scrape() {
    const jobs = [];
    for (let page = 1; page <= 70 && jobs.length < 1000; page++) {
      const html = await fetchText(`${SEARCH}&p=${page}`);
      const items = [...html.matchAll(/<a class="job-list--link[^"]*" href="([^"]+)"[\s\S]*?<p>([\s\S]*?)<\/p>([\s\S]*?)<\/a>/g)];
      for (const [, href, title, rest] of items) {
        jobs.push({
          title: decodeEntities(title),
          url: absoluteUrl(href, BASE),
          location: rest.match(/class="job-location">([\s\S]*?)<\/span>/)?.[1],
        });
      }
      const totalPages = Number(html.match(/data-total-pages="(\d+)"/)?.[1] ?? 1);
      if (!items.length || page >= totalPages) break;
    }

    if (jobs.length <= MAX_DETAIL_PAGES) {
      for (const job of jobs) {
        const posting = jobPosting(await fetchText(job.url).catch(() => ""));
        if (!posting) continue;
        // Every ad opens with the same "A career without limits" brand blurb; skip it so the teaser is about the role.
        const text = stripHtml(posting.description ?? "");
        job.description = text.replace(/^A career without limits[\s\S]*?sky is never the limit\.?\s*/i, "") || text;
        job.posted_at = posting.datePosted;
      }
    }
    return jobs;
  },
});
