// TripJack (B2B travel platform, Mumbai): https://careers.tripjack.com/ and https://tripjack.keka.com/careers/
// Both sites list the openings held in TripJack's Keka ATS. careers.tripjack.com fetches them through its own
// Supabase function, so this reads Keka's public embed feed instead (/careers/api/embedjobs/default/active/<portal>:
// title, department, cities, experience, job type, salary band, published date, HTML description) and links each
// job to its Keka job page, which is where both sites send applicants.
import { fetchJson, main, stripHtml } from "./lib.mjs";

const SITE = "https://tripjack.keka.com/careers";
const PORTAL = "e1da1c05-7d0d-4ec4-bda5-f056440e7fd6";
const FEED = `${SITE}/api/embedjobs/default/active/${PORTAL}`;
const JOB_TYPES = { 1: "Part-time", 2: "Full-time" }; // Keka's jobType codes, as the embed script labels them

await main({
  source: "tripjack",
  table: "jobs_tripjack",
  company: "TripJack",
  async scrape() {
    const jobs = await fetchJson(FEED);
    if (!Array.isArray(jobs)) throw new Error("the Keka feed is not a list (portal id changed?)");

    return jobs
      .filter((job) => job.id && job.title)
      .map((job) => {
        const cities = [...new Set((job.jobLocations ?? []).map((l) => l.name || l.city).filter(Boolean))];
        const facts = [
          job.departmentName,
          JOB_TYPES[job.jobType],
          job.experience && `${job.experience} experience`,
          job.salaryRangeFormat && `${job.salaryRangeFormat.replace(/\.00\b/g, "")} p.a.`,
          cities.length ? `at ${cities.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        // Every description opens with the same "About Tripjack" blurb; start at the role itself when it is labelled
        let prose = stripHtml(job.description ?? "");
        const role = prose.search(/\b(Role|Position|Designation|Job Summary|Job Description|Job Title)\s*:/);
        if (role > 0 && role < 2500) prose = prose.slice(role);
        return {
          title: job.title,
          url: `${SITE}/jobdetails/${job.id}`,
          location: cities.join(", ") || null,
          description: prose ? `${facts} — ${prose}` : facts,
          posted_at: job.publishedOn,
        };
      });
  },
});
