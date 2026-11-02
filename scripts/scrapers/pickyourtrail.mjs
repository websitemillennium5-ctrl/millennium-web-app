// Pickyourtrail (Chennai): https://pickyourtrail.com/careers
// The Next.js careers page ships its "Career List" inside __NEXT_DATA__ (pageProps.careerData: title, code,
// department, cities, experience range, skills, publish date). Each "Read more" opens /careers/details/<code>, whose
// own __NEXT_DATA__ carries the full job description; those pages are read in parallel for the teaser.
import { decodeEntities, fetchText, main, mapLimit, stripHtml } from "./lib.mjs";

const SITE = "https://pickyourtrail.com";
const PAGE = `${SITE}/careers`;
const CONCURRENCY = 4;

/** pageProps of a Next.js page's __NEXT_DATA__ script, or null. */
function pageProps(html) {
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) return null;
  try {
    return JSON.parse(json).props?.pageProps ?? null;
  } catch {
    return null;
  }
}

await main({
  source: "pickyourtrail",
  table: "jobs_pickyourtrail",
  company: "Pickyourtrail",
  allowEmpty: true,
  async scrape() {
    const roles = pageProps(await fetchText(PAGE))?.careerData;
    if (!Array.isArray(roles)) throw new Error("no careerData in the page's __NEXT_DATA__ (site changed?)");

    return mapLimit(
      roles.filter((role) => role.title && role.code),
      CONCURRENCY,
      async (role) => {
        const url = `${PAGE}/details/${encodeURIComponent(role.code)}`;
        const detail = pageProps(await fetchText(url).catch(() => ""))?.careerDetails?.response ?? {};
        const cities = (role.location ?? detail.location ?? []).filter(Boolean);
        const years =
          role.minExperience != null && role.maxExperience != null && role.maxExperience > 0
            ? `${role.minExperience}–${role.maxExperience} yrs experience`
            : null;
        const facts = [
          role.department ?? detail.department,
          detail.subDepartmentL1,
          years,
          role.vacancies > 1 ? `${role.vacancies} openings` : null,
          cities.length ? `at ${cities.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        // The job description is entity-encoded HTML (Google-Docs markup), so decode before stripping the tags
        const prose = detail.jobDescription ? stripHtml(decodeEntities(detail.jobDescription)) : "";
        return {
          title: role.title,
          url,
          location: cities.join(", ") || null,
          description: prose ? `${facts} — ${prose}` : facts,
          posted_at: detail.websitePublishDate ?? role.positionPublishDate,
        };
      },
    );
  },
});
