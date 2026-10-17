// Air India: https://careers.airindia.com/go/Cabin-Crew/667844/ (+ Air India Express: https://careers.airindia.com/aix/)
// Air India has no separate events page: cabin crew walk-in / hiring drives go up as postings on its SuccessFactors
// career sites (cabincrewcareers.airindia.com: "apply online before walking-in for the interview"). Searches both
// sites for drive keywords (search matches title + description), opens each hit and keeps the ones whose title or
// text reads as an event, pulling date/time/venue from the text. As of Oct 2026 none are listed (0 rows is normal).
import { EVENT_TITLE, absoluteUrl, decodeEntities, fetchText, mainEvents, stripHtml } from "../lib.mjs";

const SITES = [
  { base: "https://careers.airindia.com/", brand: "Air India" },
  { base: "https://careers.airindia.com/aix/", brand: "Air India Express" },
];
const QUERIES = ["walk-in", "walk in", "drive", "open day", "cabin crew"];
const EVENT = /walk[\s-]?in|hiring drive|recruitment drive|interview drive|open day|open house|assessment day|virtual interview|online drive/i;
const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

/** First date in free text: "12th Nov 2026", "November 12, 2026", "12/11/2026" (day first), "2026-11-12". */
function findDate(text) {
  const iso = text.match(/\b(20\d\d)-(\d\d)-(\d\d)\b/);
  if (iso) return iso[0];
  const dmy = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTHS})[a-z]*,?\\s+(20\\d\\d)`, "i"));
  const mdy = text.match(new RegExp(`\\b(${MONTHS})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)`, "i"));
  const month = (name) => MONTHS.split("|").indexOf(name.slice(0, 3).toLowerCase()) + 1;
  const ymd = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (dmy) return ymd(dmy[3], month(dmy[2]), dmy[1]);
  if (mdy) return ymd(mdy[3], month(mdy[1]), mdy[2]);
  const num = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d\d)\b/);
  return num ? ymd(num[3], num[2], num[1]) : null;
}

const findTime = (text) =>
  text.match(/\b\d{1,2}(?:[:.]\d{2})?\s?[ap]\.?m\.?(?:\s*(?:-|–|to)\s*\d{1,2}(?:[:.]\d{2})?\s?[ap]\.?m\.?)?/i)?.[0];
const findVenue = (text) => text.match(/\b(?:venue|address|location of (?:the )?(?:drive|interview))\s*[:\-–]\s*(.{5,200}?)(?:\.\s|\b(?:date|time|reporting)\b|$)/i)?.[1];

function eventType(text) {
  if (/walk[\s-]?in/i.test(text)) return "walk_in";
  if (/open (?:day|house)/i.test(text)) return "open_day";
  if (/virtual|online/i.test(text)) return "online_drive";
  return "interview";
}

async function search({ base }, q) {
  const html = await fetchText(`${base}search/?createNewAlert=false&q=${encodeURIComponent(q)}&locationsearch=`);
  return [...html.matchAll(/<li class="job-tile job-id-(\d+)[^"]*" data-url="([^"]+)"/g)].map(([, id, href]) => ({
    url: absoluteUrl(href, base),
    title: decodeEntities(html.match(new RegExp(`data-focus-tile="\\.job-id-${id}"[^>]*href="[^"]*">\\s*([^<]+?)\\s*</a>`))?.[1] ?? ""),
    city: html.match(new RegExp(`id="job-${id}-desktop-section-city-value">([^<]*)`))?.[1]?.trim(),
  }));
}

await mainEvents({
  source: "air_india",
  table: "events_air_india",
  brand: "Air India",
  async scrape() {
    const hits = new Map();
    for (const site of SITES)
      for (const q of QUERIES)
        for (const hit of await search(site, q)) hits.set(hit.url, { ...hit, brand: site.brand });

    const events = [];
    for (const hit of hits.values()) {
      const html = await fetchText(hit.url).catch(() => "");
      const text = stripHtml(html.match(/itemprop="description"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/)?.[1] ?? "");
      if (!EVENT_TITLE.test(hit.title) && !EVENT.test(hit.title) && !EVENT.test(text)) continue;
      const city = hit.city || html.match(/itemprop="addressLocality" content="([^"]*)"/)?.[1];
      const role = /cabin crew|ifs\b|in-?flight/i.test(`${hit.title} ${text}`) ? "Cabin Crew" : hit.title;
      events.push({
        title: EVENT_TITLE.test(hit.title) || EVENT.test(hit.title) ? hit.title : `${role} hiring drive${city ? `: ${city}` : ""}`,
        brand: hit.brand,
        url: hit.url,
        event_type: eventType(`${hit.title} ${text}`),
        role,
        city,
        country: "India",
        venue: findVenue(text),
        event_date: findDate(hit.title) ?? findDate(text),
        event_time: findTime(text),
        apply_url: hit.url,
        description: text,
      });
    }
    return events;
  },
});
