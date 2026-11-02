// Agoda (India): https://careersatagoda.com/vacancies/?country%5B%27India%27%5D=India
// careersatagoda.com sits behind a Cloudflare browser challenge, but its vacancies come from Agoda's public Greenhouse
// job board. Reads the board's JSON API, keeps the roles whose location is in India (Gurugram, Pune, Mumbai, …), then
// fetches each one for its department and description. Job URLs are the Greenhouse pages the site's Apply links open.
import { decodeEntities, fetchJson, main, mapLimit } from "./lib.mjs";

const API = "https://boards-api.greenhouse.io/v1/boards/agoda";
const INDIA = /\bindia\b|gurugram|gurgaon|pune|mumbai|bangalore|bengaluru|delhi|noida|hyderabad|chennai|kolkata/i;
const CONCURRENCY = 4;

await main({
  source: "agoda",
  table: "jobs_agoda",
  company: "Agoda",
  allowEmpty: true, // a handful of India roles today; the board can legitimately have none
  async scrape() {
    const { jobs = [] } = await fetchJson(`${API}/jobs`);
    const india = jobs.filter((job) => INDIA.test(job.location?.name ?? ""));

    return mapLimit(india, CONCURRENCY, async (job) => {
      const detail = await fetchJson(`${API}/jobs/${job.id}`).catch(() => null);
      const office = detail?.offices?.find((o) => INDIA.test(o.location ?? o.name ?? ""));
      const department = detail?.departments?.[0]?.name;
      const subDepartment = detail?.metadata?.find((m) => m.name === "Sub Department")?.value;
      // The description is entity-encoded HTML that opens with the same "About Agoda" intro on every role
      const content = detail?.content ? decodeEntities(detail.content).replace(/^\s*<div class="content-intro">[\s\S]*?<\/div>\s*/, "") : "";
      return {
        title: job.title,
        url: job.absolute_url,
        location: office?.location || job.location?.name,
        description:
          content ||
          [department, subDepartment !== department ? subDepartment : null, `at Agoda, ${job.location?.name}`].filter(Boolean).join(" · "),
        posted_at: job.first_published ?? job.updated_at,
      };
    });
  },
});
