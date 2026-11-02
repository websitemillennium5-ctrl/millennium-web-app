// Airbnb (India): https://careers.airbnb.com/positions/?_offices=india
// WordPress careers site fed by Airbnb's public Greenhouse job board. Reads the board's JSON API, keeps the roles whose
// location is in India (Gurugram, Bengaluru, Remote - India), then fetches each one for its department, workplace type and
// description. Job URLs are the careers.airbnb.com pages the board links to.
import { decodeEntities, fetchJson, main, mapLimit } from "./lib.mjs";

const API = "https://boards-api.greenhouse.io/v1/boards/airbnb";
const INDIA = /\bindia\b|gurugram|gurgaon|bangalore|bengaluru|delhi|noida|mumbai|pune|hyderabad|chennai|kolkata/i;
const CONCURRENCY = 4;

await main({
  source: "airbnb",
  table: "jobs_airbnb",
  company: "Airbnb",
  allowEmpty: true, // about ten India roles today; the board can legitimately have none
  async scrape() {
    const { jobs = [] } = await fetchJson(`${API}/jobs`);
    const india = jobs.filter((job) => INDIA.test(job.location?.name ?? ""));

    return mapLimit(india, CONCURRENCY, async (job) => {
      const detail = await fetchJson(`${API}/jobs/${job.id}`).catch(() => null);
      const department = detail?.departments?.[0]?.name;
      const workplace = detail?.metadata?.find((m) => m.name === "Workplace Type")?.value;
      // The description is entity-encoded HTML that opens with the same "Airbnb was born in 2007…" intro on every role
      const content = detail?.content ? decodeEntities(detail.content).replace(/^\s*<div class="content-intro">[\s\S]*?<\/div>\s*/, "") : "";
      return {
        title: job.title,
        url: job.absolute_url,
        location: job.location?.name,
        description: content || [department, workplace?.toLowerCase(), `at Airbnb, ${job.location?.name}`].filter(Boolean).join(" · "),
        posted_at: job.first_published ?? job.updated_at,
      };
    });
  },
});
