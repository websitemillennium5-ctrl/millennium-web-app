// NILE Hospitality (hotel management company; Radisson, Hyatt, Novotel properties in India): https://www.careersatnile.com/careers
// The Next.js careers site loads its jobs from a public JSON API (the same one its /careers/jobs page calls), which
// gives title, property, city, department, level, employment type and posting time.
import { fetchJson, main } from "./lib.mjs";

const SITE = "https://www.careersatnile.com/careers";
const API = "https://baikalsphere.com/hr-api/public/careers/jobs";
const PAGE_SIZE = 50; // the API caps `limit` at 50

await main({
  source: "nile",
  table: "jobs_nile",
  company: "NILE Hospitality",
  allowEmpty: true,
  async scrape() {
    const jobs = [];
    for (let page = 1; page <= 20; page++) {
      const { data } = await fetchJson(`${API}?limit=${PAGE_SIZE}&page=${page}`);
      const batch = data?.jobs ?? [];
      for (const job of batch) {
        jobs.push({
          title: job.title,
          url: `${SITE}/jobs/${job.slug}`,
          location: [...new Set([job.property, job.location_city].filter(Boolean))].join(", ") || null,
          description: [job.department, job.division !== job.department ? job.division : null, job.employment_type, job.property && `at ${job.property}`]
            .filter(Boolean)
            .join(" · "),
          posted_at: job.posted_at,
        });
      }
      const total = data?.total ?? data?.pagination?.total;
      if (batch.length < PAGE_SIZE || (total && jobs.length >= total)) break;
    }
    return jobs;
  },
});
