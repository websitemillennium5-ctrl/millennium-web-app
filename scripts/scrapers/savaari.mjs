// Savaari Car Rentals (Bangalore, now part of MakeMyTrip): https://www.savaari.com/careers
// The Angular careers page loads its "Current Job Openings" from a static /assets/json/jobs.json (id, title,
// category, HTML job description) and shows each JD in a modal; applications go to jobs@savaari.com. All roles share
// the one page, so each URL is the careers page plus a #job-<id> fragment. The list is hand-maintained.
import { fetchJson, main, stripHtml } from "./lib.mjs";

const SITE = "https://www.savaari.com";
const PAGE = `${SITE}/careers`;
const FEED = `${SITE}/assets/json/jobs.json`;
const TEAMS = { tech: "Technology", product: "Product", ops: "Operations" };

await main({
  source: "savaari",
  table: "jobs_savaari",
  company: "Savaari Car Rentals",
  allowEmpty: true,
  async scrape() {
    const jobs = await fetchJson(FEED);
    if (!Array.isArray(jobs)) throw new Error("jobs.json is not a list (site changed?)");

    return jobs
      .filter((job) => job.id && job.title)
      .map((job) => {
        const jd = job.jd ?? "";
        // The JD opens with "Location: Bangalore (Full-Time) | Experience: …" or "<b>Location:</b> Remote"
        const place = jd.match(/Location:\s*(?:<\/b>|<\/strong>)?\s*([^<\n|]+)/i)?.[1].trim() ?? "";
        const type = place.match(/\(([^)]+)\)/)?.[1] || null;
        const location = place.replace(/\s*\([^)]*\)/, "").trim() || null;
        const team = TEAMS[job.category] ?? job.category;
        const facts = [team, type, location && `at ${location}`].filter(Boolean).join(" · ");
        // The JD repeats the title as its heading; drop that so the teaser starts with the role itself
        const prose = stripHtml(jd.replace(/<h2>[^<]*<\/h2>/, ""));
        return {
          title: job.title,
          url: `${PAGE}#job-${job.id}`,
          location,
          description: prose ? `${facts} — ${prose}` : facts,
        };
      });
  },
});
