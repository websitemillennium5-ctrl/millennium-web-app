// American Express Global Business Travel (India): https://travelhrportal.wd1.myworkdayjobs.com/Jobs
// Workday career site (tenant "travelhrportal"; the former CWT careers pages redirect here since Amex GBT bought CWT).
// Reads the JSON the page loads from /wday/cxs/…/jobs, 20 a call, filtered to the India node of the Country facet, then
// fetches each job for its description, posting date, time type and — for postings that span countries — the India office.
import { fetchJson, main, mapLimit } from "./lib.mjs";

const BASE = "https://travelhrportal.wd1.myworkdayjobs.com";
const SITE = "Jobs";
const CXS = `${BASE}/wday/cxs/travelhrportal/${SITE}`;
const INDIA_COUNTRY = "bd2bf4b4421e1040c01289e2ed418910"; // facet locationHierarchy2 → "India"
const LIMIT = 20;
const CONCURRENCY = 4;
const INDIA = /\bindia\b/i;

await main({
  source: "amex_gbt",
  table: "jobs_amex_gbt",
  company: "American Express Global Business Travel",
  async scrape() {
    const postings = [];
    for (let offset = 0; offset < 1000; offset += LIMIT) {
      const { jobPostings = [] } = await fetchJson(`${CXS}/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appliedFacets: { locationHierarchy2: [INDIA_COUNTRY] }, limit: LIMIT, offset, searchText: "" }),
      });
      postings.push(...jobPostings);
      if (jobPostings.length < LIMIT) break;
    }

    return mapLimit(postings, CONCURRENCY, async (job) => {
      const info = (await fetchJson(`${CXS}${job.externalPath}`).catch(() => null))?.jobPostingInfo;
      // "2 Locations" postings list a foreign primary office; the India one is among additionalLocations
      const location =
        [job.locationsText, info?.location, ...(info?.additionalLocations ?? [])].find((l) => l && INDIA.test(l)) ?? job.locationsText;
      // Every description opens with the same "Amex GBT is a place where colleagues find inspiration…" paragraph
      const description = info?.jobDescription?.replace(/^\s*<p>[^]*?Amex GBT is a place where colleagues[^]*?<\/p>/, "").trim();
      return {
        title: job.title,
        url: `${BASE}/en-US/${SITE}${job.externalPath}`,
        location,
        description: description || [info?.timeType, `at Amex GBT, ${location}`].filter(Boolean).join(" · "),
        posted_at: info?.startDate ?? null,
      };
    });
  },
});
