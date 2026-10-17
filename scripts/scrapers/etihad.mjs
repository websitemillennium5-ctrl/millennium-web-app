// Etihad Airways: https://careers.smartrecruiters.com/EtihadAirways5/
// Pages through SmartRecruiters' public postings API (100 per call); the list has no body text, so the teaser is division/section.
import { fetchJson, main } from "./lib.mjs";

const API = "https://api.smartrecruiters.com/v1/companies/EtihadAirways5/postings";

await main({
  source: "etihad",
  table: "jobs_etihad",
  company: "Etihad Airways",
  async scrape() {
    const jobs = [];
    for (let offset = 0; offset < 1000; offset += 100) {
      const { content = [], totalFound = 0 } = await fetchJson(`${API}?limit=100&offset=${offset}`);
      for (const job of content) {
        const field = (label) => job.customField?.find((f) => f.fieldLabel === label)?.valueLabel;
        jobs.push({
          title: job.name,
          url: `https://jobs.smartrecruiters.com/EtihadAirways5/${job.id}`,
          location: [job.location?.city, field("Country/Region")].filter(Boolean).join(", "),
          description: [field("Division"), field("Section"), job.typeOfEmployment?.label].filter(Boolean).join(" · "),
          posted_at: job.releasedDate,
        });
      }
      if (!content.length || offset + 100 >= totalFound) break;
    }
    return jobs;
  },
});
