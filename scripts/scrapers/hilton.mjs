// Hilton (India): https://efet.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1009/jobs?location=India&locationId=300000000228786
// Oracle Recruiting Cloud career site. Reads the public REST resource the page itself loads, 200 requisitions a call,
// filtered to the India location node; each row already carries the posting date and a short description.
import { fetchJson, main } from "./lib.mjs";

const BASE = "https://efet.fa.us2.oraclecloud.com";
const SITE = "CX_1009";
const INDIA = "300000000228786";
const LIMIT = 200;

const listUrl = (offset) =>
  `${BASE}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations` +
  `&finder=findReqs;siteNumber=${SITE},limit=${LIMIT},offset=${offset},locationId=${INDIA},sortBy=POSTING_DATES_DESC`;

await main({
  source: "hilton",
  table: "jobs_hilton",
  company: "Hilton",
  async scrape() {
    const jobs = [];
    for (let offset = 0; offset < 3000; offset += LIMIT) {
      const { items = [] } = await fetchJson(listUrl(offset));
      const page = items[0]?.requisitionList ?? [];
      for (const r of page) {
        jobs.push({
          title: r.Title,
          url: `${BASE}/hcmUI/CandidateExperience/en/sites/${SITE}/job/${r.Id}`,
          location: r.PrimaryLocation,
          description: [r.ShortDescriptionStr, r.WorkplaceType && r.WorkplaceType !== "On-site" ? r.WorkplaceType : null].filter(Boolean).join(" · "),
          posted_at: r.PostedDate,
        });
      }
      if (page.length < LIMIT || offset + LIMIT >= (items[0]?.TotalJobsCount ?? 0)) break;
    }
    return jobs;
  },
});
