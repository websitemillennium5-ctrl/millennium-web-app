// Hyatt (India): https://careers.hyatt.com/en-US/careers/search?searchable=[{"filterId":"KEYWORD","text":"india"}]
// Taleo career section behind an InFlight front end. Calls the same job-board search the page uses (25 results a page,
// international portal), then keeps the rows whose location codes start with "IN-". A keyword search for "india"
// misses most Indian hotels (and matches Hong Kong), so the whole portal is paged instead; each page is a few KB.
import { main, mapLimit, request } from "./lib.mjs";

const BASE = "https://careers.hyatt.com";
const PORTAL = "22260210089"; // "International" in the site's InFlight config; the US portal has no Indian jobs
const SECTION = "10880"; // the career section number that portal's job pages live under
const PAGE_SIZE = 25;
const MAX_PAGES = 200;
const CONCURRENCY = 4;

const filters = (ids) => ({ searchFilterSelections: ids.map((id) => ({ id, selectedValues: [] })) });
const body = (pageNo) =>
  JSON.stringify({
    multilineEnabled: false,
    sortingSelection: { sortBySelectionParam: "3", ascendingSortingOrder: "false" }, // newest first
    fieldData: { fields: { KEYWORD: "", LOCATION: "", JOB_TITLE: "" }, valid: true },
    filterSelectionParam: filters(["POSTING_DATE", "LOCATION", "JOB_FIELD", "JOB_TYPE", "JOB_SCHEDULE"]),
    advancedSearchFiltersSelectionParam: filters(["ORGANIZATION", "LOCATION", "JOB_FIELD", "URGENT_JOB", "EMPLOYEE_STATUS", "STUDY_LEVEL", "WILL_TRAVEL", "JOB_SHIFT"]),
    pageNo,
  });

async function searchPage(pageNo) {
  const res = await request(`${BASE}/careersection/rest/jobboard/searchjobs?lang=en&portal=${PORTAL}`, {
    method: "POST",
    body: body(pageNo),
    headers: { "content-type": "application/json", accept: "application/json", tz: "GMT+05:30", tzname: "Asia/Kolkata" },
  });
  return res.json();
}

/** Taleo location codes look like "IN-HR-Gurgaon" / "IN-Mumbai". */
const locations = (row) => {
  const col = row.locationsColumns?.[0] ?? 3;
  try {
    return JSON.parse(row.column[col]);
  } catch {
    return [row.column[col]];
  }
};

await main({
  source: "hyatt",
  table: "jobs_hyatt",
  company: "Hyatt",
  async scrape() {
    const first = await searchPage(1);
    const total = first.pagingData?.totalCount ?? 0;
    const pages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
    const rest = await mapLimit(Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => i + 2), CONCURRENCY, searchPage);
    const rows = [first, ...rest].flatMap((p) => p.requisitionList ?? []);

    const jobs = [];
    for (const row of rows) {
      const india = locations(row).filter((l) => /^IN-/.test(l));
      if (!india.length) continue;
      const [title, hotel, jobField, , posted] = row.column;
      const cities = india.map((l) => l.split("-").at(-1));
      jobs.push({
        title,
        url: `${BASE}/careersection/${SECTION}/jobdetail.ftl?job=${row.contestNo}&lang=en`,
        location: [...new Set([hotel, ...cities].filter(Boolean))].join(", "),
        description: [jobField, hotel && `at ${hotel}`].filter(Boolean).join(" · "),
        posted_at: posted,
      });
    }
    return jobs;
  },
});
