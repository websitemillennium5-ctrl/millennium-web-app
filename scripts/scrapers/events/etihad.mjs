// Etihad Airways: https://jobs.smartrecruiters.com/EtihadAirways5/744000154681470-cabin-crew
// Etihad lists its cabin crew recruitment days inside the "Cabin Crew" SmartRecruiters posting ("Meet us in person"):
// one <li><a href="https://smrtr.io/…">13 October | Barcelona, Spain</a></li> per event, each linking to the event's
// registration page. Finds cabin crew postings via the public API and parses those lists; dates have no year, so it's inferred.
import { decodeEntities, fetchJson, mainEvents, stripHtml } from "../lib.mjs";

const API = "https://api.smartrecruiters.com/v1/companies/EtihadAirways5/postings";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "16 & 17 October" → the first day as YYYY-MM-DD, rolling into next year if it's well past. */
function inferDate(text) {
  const [, day, mon] = text.match(/(\d{1,2})\D*?([a-z]{3})[a-z]*/i) ?? [];
  const month = MONTHS.indexOf(mon?.toLowerCase());
  if (month < 0) return null;
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), month, Number(day)));
  if (date < now - 60 * 864e5) date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

await mainEvents({
  source: "etihad",
  table: "events_etihad",
  brand: "Etihad Airways",
  async scrape() {
    const { content = [] } = await fetchJson(`${API}?limit=100&q=${encodeURIComponent("cabin crew")}`);
    const events = [];
    for (const posting of content.filter((p) => /cabin crew/i.test(p.name))) {
      const { jobAd, postingUrl } = await fetchJson(`${API}/${posting.id}`);
      const html = Object.values(jobAd?.sections ?? {}).map((s) => s.text ?? "").join(" ");
      const list = html.match(/recruitment events?[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)?.[1] ?? "";
      const requirements = html.match(/re looking for([\s\S]*?)<p><strong>/i)?.[1] ?? "";
      const eligibility = [...requirements.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => stripHtml(m[1])).join("; ");
      for (const [, href, label] of list.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        const [when, place = ""] = stripHtml(decodeEntities(label)).split(/\s*\|\s*/);
        const [city, country] = place.split(/,\s*(?=[^,]+$)/);
        events.push({
          title: `Cabin Crew recruitment day: ${city}`,
          url: href.replace(/^http:/, "https:"),
          event_type: "open_day",
          role: "Cabin Crew",
          city,
          country,
          event_date: inferDate(when),
          event_time: /&|-|–/.test(when) ? when : null,
          apply_url: href.replace(/^http:/, "https:"),
          description: `Meet Etihad's recruitment team and fast-track your cabin crew application (register via the link; can't attend? apply online at ${postingUrl}). Requirements: ${eligibility}`,
        });
      }
    }
    return events;
  },
});
