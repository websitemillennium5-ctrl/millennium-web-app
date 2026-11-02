// Navan (India): https://navan.com/careers/openings
// The openings page fills itself from Navan's public Greenhouse job board (still under the company's old name,
// "tripactions"). Reads the board's JSON API, keeps the roles located in India (Bengaluru, Gurugram, Mumbai, Delhi), then
// fetches each one for its department and description. Job URLs are the navan.com pages the board links to (?gh_jid=…).
import { decodeEntities, fetchJson, main, mapLimit } from "./lib.mjs";

const API = "https://boards-api.greenhouse.io/v1/boards/tripactions";
const INDIA = /\bindia\b|,\s*IN$|gurugram|gurgaon|pune|mumbai|bangalore|bengaluru|delhi|noida|hyderabad|chennai|kolkata/i;
const CONCURRENCY = 4;

await main({
  source: "navan",
  table: "jobs_navan",
  company: "Navan",
  async scrape() {
    const { jobs = [] } = await fetchJson(`${API}/jobs`);
    const india = jobs.filter((job) => INDIA.test(job.location?.name ?? "") && !/indiana/i.test(job.location?.name ?? ""));

    return mapLimit(india, CONCURRENCY, async (job) => {
      const detail = await fetchJson(`${API}/jobs/${job.id}`).catch(() => null);
      const office = detail?.offices?.find((o) => /india/i.test(o.location ?? ""));
      const department = detail?.departments?.[0]?.name;
      // The description is entity-encoded HTML that opens with the same "At Navan, our mission is…" paragraph on every role
      const content = detail?.content ? decodeEntities(detail.content).replace(/^\s*<p>[^<]*At Navan, our mission[\s\S]*?<\/p>/, "") : "";
      const location = office?.location || job.location?.name.replace(/,\s*IN$/, ", India");
      return {
        title: job.title,
        url: job.absolute_url,
        location,
        description: content || [department, `at Navan, ${location}`].filter(Boolean).join(" · "),
        posted_at: job.first_published ?? job.updated_at,
      };
    });
  },
});
