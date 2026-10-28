// Wyndham Hotels & Resorts (EMEA franchise board): https://wyndhamhotelcareers.com/hotel-careers
// Jobful job board. The /jobs page embeds every open job as JSON on its <jobs-listing :jobs="…"> element, with the
// hotel, city, country, posting time and full description. The board is small and mostly outside India.
import { decodeEntities, fetchText, main } from "./lib.mjs";

const BASE = "https://wyndhamhotelcareers.com";

await main({
  source: "wyndham",
  table: "jobs_wyndham",
  company: "Wyndham Hotels & Resorts",
  allowEmpty: true,
  async scrape() {
    const html = await fetchText(`${BASE}/jobs`);
    const value = html.match(/<jobs-listing[^>]*:jobs="([^"]*)"/)?.[1];
    if (!value) throw new Error("no <jobs-listing> data on the page (site changed?)");
    const jobs = JSON.parse(decodeEntities(value));
    return jobs
      .filter((job) => job.active !== false && !job.closed)
      .map((job) => {
        const city = job.city?.[0];
        return {
          title: job.title,
          url: job.url || `${BASE}/jobs/${job.slug}`,
          company: job.company?.name || undefined,
          location: [city?.name, city?.country].filter(Boolean).join(", ") || null,
          description: job.description,
          posted_at: job.board?.created_at,
        };
      });
  },
});
