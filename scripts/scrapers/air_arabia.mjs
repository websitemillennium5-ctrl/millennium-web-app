// Air Arabia: https://www.airarabiagroupcareers.com/gb/en/search-results?keywords=cabin%20crew
// Phenom People site: POSTs to the same /widgets "refineSearch" endpoint the page uses, keeping the "cabin crew" keyword.
import { fetchJson, main } from "./lib.mjs";

const BASE = "https://www.airarabiagroupcareers.com";
const KEYWORDS = "cabin crew";
const SIZE = 50;

const slug = (title) => title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

await main({
  source: "air_arabia",
  table: "jobs_air_arabia",
  company: "Air Arabia",
  skipEvents: true, // open days / drives posted as job ads go to the Hiring events page
  async scrape() {
    const jobs = [];
    for (let from = 0; from < 1000; from += SIZE) {
      const { refineSearch } = await fetchJson(`${BASE}/widgets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang: "en_gb",
          deviceType: "desktop",
          country: "gb",
          pageName: "search-results",
          ddoKey: "refineSearch",
          pageId: "page21",
          siteType: "external",
          global: true,
          jobs: true,
          counts: false,
          keywords: KEYWORDS,
          selected_fields: {},
          from,
          size: SIZE,
        }),
      });
      const page = refineSearch?.data?.jobs ?? [];
      for (const job of page) {
        jobs.push({
          title: job.title,
          url: `${BASE}/gb/en/job/${job.jobId}/${slug(job.title)}`,
          location: job.location || job.cityStateCountry,
          description: job.descriptionTeaser,
          posted_at: job.postedDate,
        });
      }
      if (page.length < SIZE || from + SIZE >= (refineSearch?.totalHits ?? 0)) break;
    }
    return jobs;
  },
});
