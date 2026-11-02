// Sabre (India): https://sabre.wd1.myworkdayjobs.com/SabreJobs?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e
// Workday career site (careers.sabre.com links to it; the Bengaluru GCC is most of the India list). Reads the JSON the page
// POSTs to /wday/cxs/…/jobs, filtered to the India country facet, 20 a call; then fetches each posting for its description,
// posting date and time type.
import { fetchJson, main, mapLimit } from "./lib.mjs";

const BASE = "https://sabre.wd1.myworkdayjobs.com";
const SITE = "SabreJobs";
const API = `${BASE}/wday/cxs/sabre/${SITE}`;
const INDIA = "c4f78be1a8f14da0ab49ce1162348a5e"; // locationCountry facet id
const INDIA_RE = /\bindia\b|bangalore|bengaluru|pune|chennai|delhi|gurgaon|gurugram|mumbai|hyderabad|noida/i;
const LIMIT = 20;
const CONCURRENCY = 4;

await main({
  source: "sabre",
  table: "jobs_sabre",
  company: "Sabre",
  async scrape() {
    const postings = [];
    for (let offset = 0; offset < 2000; offset += LIMIT) {
      const { jobPostings = [], total = 0 } = await fetchJson(`${API}/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appliedFacets: { locationCountry: [INDIA] }, limit: LIMIT, offset, searchText: "" }),
      });
      postings.push(...jobPostings);
      if (jobPostings.length < LIMIT || postings.length >= total) break;
    }

    return mapLimit(postings, CONCURRENCY, async (posting) => {
      const detail = (await fetchJson(`${API}${posting.externalPath}`).catch(() => null))?.jobPostingInfo;
      // A posting can be primarily elsewhere (e.g. Montevideo) and also open as "India Remote": show the India location
      const locations = [detail?.location, ...(detail?.additionalLocations ?? [])].filter(Boolean);
      const location = locations.find((l) => INDIA_RE.test(l)) || locations[0] || posting.locationsText;
      // Every posting opens with the same "Powering the agentic revolution in travel…" paragraph; the card is better without it
      const description = detail?.jobDescription?.replace(/^\s*<p>\s*<b>\s*Powering the agentic revolution in travel[\s\S]*?<\/p>/, "").trim();
      return {
        title: posting.title,
        url: `${BASE}/${SITE}${posting.externalPath}`,
        location,
        description:
          description ||
          [detail?.timeType?.toLowerCase(), detail?.remoteType?.toLowerCase(), `at Sabre, ${location}`].filter(Boolean).join(" · "),
        posted_at: detail?.startDate ?? null,
      };
    });
  },
});
