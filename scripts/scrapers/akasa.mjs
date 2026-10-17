// Akasa Air: https://careers-akasa.peoplestrong.com/job/joblist
// PeopleStrong Angular SPA: POSTs to the public jobs/v1 endpoint its job list page calls (found in chunk JS), paged by offset.
import { fetchJson, main } from "./lib.mjs";

const API = "https://careers-akasa.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1";
const LIMIT = 50;

await main({
  source: "akasa",
  table: "jobs_akasa",
  company: "Akasa Air",
  skipEvents: true, // open days / drives posted as job ads go to the Hiring events page
  async scrape() {
    const jobs = [];
    for (let offset = 0; offset < 1000; offset += LIMIT) {
      const { totalRecords = 0, response = [] } = await fetchJson(`${API}?offset=${offset}&limit=${LIMIT}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      for (const job of response) {
        const skills = job.skills?.mustTohave?.concat(job.skills?.goodtohave ?? []) ?? [];
        jobs.push({
          title: job.jobTitle || job.designation,
          url: job.jobDetailUrl,
          location: job.locationHierarchy,
          description: [
            job.organizationUnit,
            job.expRange && `Experience: ${job.expRange}`,
            job.jobClosureDate && `Apply by ${job.jobClosureDate}`,
            skills.length && `Skills: ${skills.join(", ")}`,
          ]
            .filter(Boolean)
            .join(". "),
          posted_at: job.jobPostedDate,
        });
      }
      if (response.length < LIMIT || offset + LIMIT >= totalRecords) break;
    }
    return jobs;
  },
});
