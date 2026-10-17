// flydubai: https://careers.flydubai.com/jobs
// A Jibe (iCIMS) careers site; the search page loads its listings from the public /api/jobs JSON endpoint, which we page through.
import { fetchJson, main } from "./lib.mjs";

const BASE = "https://careers.flydubai.com";

await main({
  source: "flydubai",
  table: "jobs_flydubai",
  company: "flydubai",
  skipEvents: true, // open days / drives posted as job ads go to the Hiring events page
  async scrape() {
    const jobs = [];
    for (let page = 1; page <= 100 && jobs.length < 1000; page++) {
      const { jobs: batch = [], totalCount = 0 } = await fetchJson(
        `${BASE}/api/jobs?page=${page}&sortBy=relevance&descending=false&internal=false`,
      );
      for (const { data: job } of batch) {
        jobs.push({
          title: job.title,
          url: `${BASE}/jobs/${job.slug}?lang=${job.language ?? "en-us"}`,
          location: [job.city, job.country].filter(Boolean).join(", ") || job.location_name,
          description: job.description,
          posted_at: job.posted_date,
        });
      }
      if (!batch.length || jobs.length >= totalCount) break;
    }
    return jobs;
  },
});
