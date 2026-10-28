// ITC Limited: https://recruitment.itcportal.com/jobs/Careers
// Zoho Recruit career site. The page ships its whole job list as JSON in a hidden <input id="jobs"> (the page's own
// script reads it from there), with business, function, city, state, opening date and the full description.
import { decodeEntities, fetchText, main } from "./lib.mjs";

const BASE = "https://recruitment.itcportal.com";
const slug = (title) => title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

await main({
  source: "itc",
  table: "jobs_itc",
  company: "ITC Limited",
  async scrape() {
    const html = await fetchText(`${BASE}/jobs/Careers`);
    const value = html.match(/<input[^>]+id="jobs"[^>]+value="([^"]*)"/)?.[1] ?? html.match(/<input[^>]+value="([^"]*)"[^>]+id="jobs"/)?.[1];
    if (!value) throw new Error("no #jobs input on the page (site changed?)");
    const jobs = JSON.parse(decodeEntities(value));
    return jobs.map((job) => ({
      title: job.Posting_Title,
      url: `${BASE}/jobs/Careers/${job.id}/${slug(job.Posting_Title ?? "")}`,
      location: [...new Set([job.City, job.State, job.Country].filter(Boolean))].join(", ") || null,
      description:
        [[job.ITC_Business, job.Function, job.Job_Type].filter(Boolean).join(" · "), job.Job_Description].filter(Boolean).join(" — ") || null,
      posted_at: job.Date_Opened,
    }));
  },
});
