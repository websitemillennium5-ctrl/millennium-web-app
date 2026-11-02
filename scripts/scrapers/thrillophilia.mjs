// Thrillophilia (online travel experiences marketplace, Jaipur): https://www.thrillophilia.com/careers
// One server-rendered page lists every opening as a card (team heading, title, "City - Full Time") linking to its own
// /job_openings/<id>/apply page, which carries the job description; those pages are read in parallel for the teaser.
import { fetchText, main, mapLimit, stripHtml } from "./lib.mjs";

const SITE = "https://www.thrillophilia.com";
const PAGE = `${SITE}/careers`;
const CONCURRENCY = 4;

await main({
  source: "thrillophilia",
  table: "jobs_thrillophilia",
  company: "Thrillophilia",
  allowEmpty: true,
  async scrape() {
    const html = (await fetchText(PAGE)).replace(/\s+/g, " ");
    const cards = [...html.matchAll(/<a href="(\/job_openings\/\d+\/apply)"[^>]*>[\s\S]*?profile-name"\s*>\s*([^<]*?)\s*<\/span>\s*<span[^>]*profile-location"\s*>\s*([^<]*?)\s*<\/span>/g)];
    return mapLimit(cards, CONCURRENCY, async ([, href, title, place]) => {
      const url = `${SITE}${href}`;
      const [city, type] = place.split(/\s+-\s+/);
      const detail = (await fetchText(url).catch(() => "")).replace(/\s+/g, " ");
      const team = detail.match(/section__intro__title">\s*([^<]*?)\s*<span/)?.[1];
      const prose = stripHtml(detail.match(/profile__job-responsiblity">([\s\S]*?)<div class="input-holder apply-mobile"/)?.[1] ?? "");
      const facts = [team, type?.trim(), city && `at ${city.trim()}`].filter(Boolean).join(" · ");
      return {
        title,
        url,
        location: city?.trim() || null,
        description: prose ? `${facts} — ${prose}` : facts,
      };
    });
  },
});
