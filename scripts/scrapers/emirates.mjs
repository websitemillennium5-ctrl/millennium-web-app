// Emirates Group: https://www.emiratesgroupcareers.com/search-and-apply/
// Reads the JSON feed the React search page loads from /api/v1/jobs (all open roles in one response, with full descriptions).
import { fetchJson, main } from "./lib.mjs";

const BASE = "https://www.emiratesgroupcareers.com";

await main({
  source: "emirates",
  table: "jobs_emirates",
  company: "Emirates Group",
  async scrape() {
    // showAll=true: with false the site hides roles it deems "similar" to ones already listed, which are still distinct jobs.
    const { data = [] } = await fetchJson(
      `${BASE}/api/v1/jobs?title=&brand=&category=&location=&jobcategory=&showAll=true`,
    );
    return data.slice(0, 1000).map((job) => ({
      title: job.title,
      url: `${BASE}/search-and-apply/${job.reqid}/`,
      company: job.brand || undefined,
      location: [job.city, job.country].filter(Boolean).join(", ") || job.location,
      description: job.jobdescription,
      posted_at: job.postingdate,
    }));
  },
});
