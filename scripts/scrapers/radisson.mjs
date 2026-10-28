// Radisson Hotel Group (India): https://radissoncareers.com/jobs?options=692&page=1
// Attrax career site (12 server-rendered tiles a page). The tiles give title, hotel, brand, department and a teaser;
// each job page's JSON-LD adds the posting date and the full description (the list is small, ~130 jobs).
import { attraxDescription, fetchJobPosting, main, mapLimit, scrapeAttrax } from "./lib.mjs";

const LIST = "https://radissoncareers.com/jobs?options=692"; // 692 = the "India" location option
const DETAIL_LIMIT = 400;

await main({
  source: "radisson",
  table: "jobs_radisson",
  company: "Radisson Hotel Group",
  async scrape() {
    const tiles = await scrapeAttrax(LIST);
    const jobs = tiles.map(({ title, url, location, description, fields }) => {
      const hotel = fields["option-hotel-name"];
      return {
        title,
        url,
        company: fields["option-brand"] || undefined,
        location: [...new Set([hotel, location].filter(Boolean))].join(", ") || null,
        description: [fields["option-department"], fields["option-type-of-employment"], description].filter(Boolean).join(" · "),
      };
    });

    if (jobs.length <= DETAIL_LIMIT) {
      await mapLimit(jobs, 4, async (job) => {
        const posting = await fetchJobPosting(job.url);
        if (!posting) return;
        job.posted_at = posting.datePosted;
        job.description = attraxDescription(posting) || job.description;
      });
    }
    return jobs;
  },
});
