// MakeMyTrip (also Goibibo and redBus, the group's other brands): https://careers.makemytrip.com/jobs
// The React careers site is an empty shell that loads every opening from its own JSON API (/api/jobs, backed by
// Darwinbox) and each job's prose from /api/jobDetails?jobId=…; the site links jobs as /opportunity/<id>/<title-slug>.
import { decodeEntities, fetchJson, main, mapLimit } from "./lib.mjs";

const SITE = "https://careers.makemytrip.com";
const CONCURRENCY = 4;

/** The site's own slug: lower-cased title with spaces and slashes turned into dashes. */
const slug = (title) => title.toLowerCase().replace(/\/|\s/g, "-");

/** "09-06-2026 14:41:56" (day first) → "2026-06-09". */
const dayFirst = (stamp) => stamp?.match(/^(\d{2})-(\d{2})-(\d{4})/)?.slice(1, 4).reverse().join("-") ?? null;

const brand = (groupCompany = "") =>
  /goibibo/i.test(groupCompany) ? "Goibibo" : /redbus/i.test(groupCompany) ? "redBus" : "MakeMyTrip";

await main({
  source: "makemytrip",
  table: "jobs_makemytrip",
  company: "MakeMyTrip",
  async scrape() {
    const { allJobs = [] } = await fetchJson(`${SITE}/api/jobs`);
    const jobs = allJobs.filter((job) => !job.location_country || /india/i.test(job.location_country));

    // The listing carries no prose; the detail endpoint returns the (entity-encoded) job description
    const prose = await mapLimit(jobs, CONCURRENCY, (job) =>
      fetchJson(`${SITE}/api/jobDetails?jobId=${job.job_id}`)
        .then((res) => decodeEntities(res?.data?.job_decription ?? ""))
        .catch(() => ""),
    );

    return jobs.map((job, i) => {
      const cities = [...new Set(job.location_city ?? [])];
      const experience =
        job.experience_from && job.experience_to ? `${job.experience_from}–${job.experience_to} yrs experience` : null;
      return {
        title: job.job_title,
        url: `${SITE}/opportunity/${job.job_id}/${slug(job.job_title)}`,
        company: brand(job.group_company),
        location: cities.join(", ") || job.location?.[0]?.replace(/\s*\(.*\)$/, "") || null,
        description:
          prose[i] || [job.business_unit, job.department !== job.business_unit ? job.department : null, experience].filter(Boolean).join(" · "),
        posted_at: dayFirst(job.job_created_timestamp),
      };
    });
  },
});
