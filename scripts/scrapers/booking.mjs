// Booking.com / Booking Holdings (India): https://jobs.booking.com/booking/jobs?location=India
// Jibe (iCIMS) career site. Reads the JSON the Angular search page loads from /api/jobs, filtered to India, up to 100 a
// call; each row carries the brand (Booking.com or the Booking Holdings centre of excellence), city, category, employment
// type, posting date and the full description.
import { fetchJson, main } from "./lib.mjs";

const BASE = "https://jobs.booking.com";
const LIMIT = 100;

await main({
  source: "booking",
  table: "jobs_booking",
  company: "Booking.com",
  async scrape() {
    const jobs = [];
    for (let page = 1; page <= 20; page++) {
      const { jobs: batch = [], totalCount = 0 } = await fetchJson(`${BASE}/api/jobs?location=India&page=${page}&limit=${LIMIT}`);
      for (const { data: job } of batch) {
        if (job.country && !/india/i.test(job.country)) continue; // the location search is a radius match, so keep it strict
        const categories = (job.categories ?? []).map((c) => c.name).filter(Boolean).join(" / ");
        jobs.push({
          title: job.title,
          url: `${BASE}/booking/jobs/${job.slug}`,
          company: job.brand || undefined,
          location: [...new Set([job.city, job.state].filter(Boolean))].join(", ") || job.full_location,
          description:
            job.description ||
            [categories, job.employment_type?.toLowerCase().replace(/_/g, "-"), job.city && `at ${job.brand || "Booking.com"}, ${job.city}`].filter(Boolean).join(" · "),
          posted_at: job.posted_date,
        });
      }
      if (batch.length < LIMIT || jobs.length >= totalCount) break;
    }
    return jobs;
  },
});
