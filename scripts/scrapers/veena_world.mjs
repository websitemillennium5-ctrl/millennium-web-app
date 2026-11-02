// Veena World (tour operator, Mumbai): https://www.veenaworld.com/careers
// The Angular careers page loads its openings from a public JSON API on the same host (PeopleStrong ATS data:
// title, department, city, experience range, openings, posted and closing dates). Each job links to its own page on
// veenaworldcareers.peoplestrong.com, where the application is made.
import { fetchJson, main } from "./lib.mjs";

const API = "https://www.veenaworld.com/nextapi/leap/careers/getCareersData";

const shortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null;

await main({
  source: "veena_world",
  table: "jobs_veena_world",
  company: "Veena World",
  async scrape() {
    const { body } = await fetchJson(API);
    return (body ?? []).map((job) => {
      // "India>Maharashtra>Mumbai>Corporate Office" → office name, for the card's location
      const office = job.locationHierarchyComplete?.split(">")[3]?.trim();
      const city = job.locationHierarchy;
      const closes = shortDate(job.jobClosureDate);
      return {
        title: job.jobTitle || job.designation,
        url: job.jobDetailUrl,
        location: [...new Set([office, city].filter(Boolean))].join(", ") || null,
        description: [
          job.organizationUnit,
          job.expRange && `${job.expRange} experience`,
          job.openings > 1 && `${job.openings} openings`,
          office && office !== city && `at ${office}`,
          closes && `Apply by ${closes}`,
        ]
          .filter(Boolean)
          .join(" · "),
        posted_at: job.jobPostedDate,
      };
    });
  },
});
