// ixigo: https://careers.ixigo.com/#openings
// The Next.js careers site fills its "Open roles" table from its own /api/openings route (a SmartRecruiters widget
// feed) and links each row to the SmartRecruiters job page. The public SmartRecruiters postings API adds the
// function, level and job description. Usually only a handful of roles, sometimes none.
import { fetchJson, main, mapLimit } from "./lib.mjs";

const SITE = "https://careers.ixigo.com";
const POSTINGS = "https://api.smartrecruiters.com/v1/companies/ixigo/postings";
const CONCURRENCY = 4;

/** refNumber → public posting (with the job ad) from SmartRecruiters; failures just leave the extras empty. */
async function postingsByRef() {
  const byRef = new Map();
  try {
    const { content = [] } = await fetchJson(`${POSTINGS}?limit=100`);
    const details = await mapLimit(content, CONCURRENCY, (p) => fetchJson(`${POSTINGS}/${p.id}`).catch(() => p));
    for (const posting of details) byRef.set(posting.refNumber, posting);
  } catch (error) {
    console.error(`[ixigo] SmartRecruiters postings unavailable, descriptions left short: ${error.message}`);
  }
  return byRef;
}

await main({
  source: "ixigo",
  table: "jobs_ixigo",
  company: "ixigo",
  allowEmpty: true,
  async scrape() {
    const [{ data }, postings] = await Promise.all([fetchJson(`${SITE}/api/openings`), postingsByRef()]);
    return (data?.results ?? [])
      .filter((job) => !job.countryName || /india/i.test(job.countryName))
      .map((job) => {
        const posting = postings.get(job.refNumber);
        const sections = posting?.jobAd?.sections ?? {};
        const summary = [
          posting?.function?.label,
          posting?.experienceLevel?.label,
          job.typeOfEmployment,
          job.locationRemote ? "Remote" : job.locationHybrid ? "Hybrid" : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return {
          title: job.vacancyName,
          url: `https://jobs.smartrecruiters.com/ixigo/${job.jobVacancyId}`,
          location: job.location || posting?.location?.city || null,
          description: [summary, sections.jobDescription?.text].filter(Boolean).join(" — "),
          posted_at: job.releasedDate ?? posting?.releasedDate,
        };
      });
  },
});
