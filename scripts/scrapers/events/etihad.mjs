// Etihad Airways: https://careers.etihad.com/ (upcoming events) + the "Cabin Crew" SmartRecruiters posting
// The careers homepage embeds the full events calendar as JSON (eventCategories → eventItems, for Pilots and Cabin Crew,
// each with a location, a dated "1 November 2026" and a registration link). The Cabin Crew posting also lists its
// recruitment days ("13 October | Barcelona, Spain", no year) and carries the eligibility text, so both are read and
// merged by city and date.
import { decodeEntities, fetchJson, fetchText, mainEvents, stripHtml } from "../lib.mjs";

const HOME = "https://careers.etihad.com/";

const API = "https://api.smartrecruiters.com/v1/companies/EtihadAirways5/postings";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Every { title, eventItems } category embedded in the homepage (the page carries a couple of event blocks). */
function homepageCategories(html) {
  const text = html.replace(/\\"/g, '"');
  const categories = [];
  for (let at = text.indexOf('"eventCategories":['); at >= 0; at = text.indexOf('"eventCategories":[', at + 1)) {
    const start = text.indexOf("[", at);
    let depth = 0;
    let end = start;
    for (; end < text.length; end++) {
      if (text[end] === "[") depth++;
      else if (text[end] === "]" && --depth === 0) break;
    }
    try {
      categories.push(...JSON.parse(text.slice(start, end + 1)));
    } catch {
      // a malformed block; the other block and the posting still cover the events
    }
  }
  return categories;
}

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

    // The homepage calendar: catches recruitment days missing from the posting's list, and the pilot roadshows.
    // Dates come from the rendered list (<time dateTime="2026-10-27">); the embedded JSON says which are pilot events.
    const html = await fetchText(HOME);
    const roles = new Map();
    for (const category of homepageCategories(html)) {
      for (const item of category.eventItems ?? []) if (item.link?.href) roles.set(item.link.href.trim(), stripHtml(category.title ?? ""));
    }
    const key = (city, date) => `${(city ?? "").toLowerCase().trim()}|${date}`;
    const listed = new Set(events.map((e) => key(e.city, e.event_date)));
    const items = html.matchAll(/<time[^>]+dateTime="(\d{4}-\d{2}-\d{2})"[\s\S]*?<span class="body-text bold">([^<]+)<\/span>[\s\S]*?href="([^"]+)"/g);
    for (const [, date, location, rawHref] of items) {
      const href = decodeEntities(rawHref).trim().replace(/^http:/, "https:");
      const [city, country] = stripHtml(location).split(/,\s*(?=[^,]+$)/);
      if (listed.has(key(city, date))) continue;
      listed.add(key(city, date));
      const role = roles.get(href) || (/pilot/i.test(href) ? "Pilots" : "Cabin Crew");
      const online = /virtual|online/i.test(city);
      events.push({
        title: `${role} ${online ? "virtual recruitment event" : `recruitment day: ${city}`}`,
        // Several cities share one roadshow registration link, so each event gets its own fragment.
        url: `${href}#${city.toLowerCase().replace(/\W+/g, "-")}-${date}`,
        event_type: online ? "online_drive" : "open_day",
        role,
        city: online ? null : city,
        country,
        event_date: date,
        apply_url: href,
        description: `Etihad ${role.toLowerCase()} recruitment ${online ? "event online" : `day in ${city}`}. Register through the link to take part; see careers.etihad.com for requirements.`,
      });
    }
    return events;
  },
});
