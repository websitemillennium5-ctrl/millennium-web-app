// flydubai: https://careers.flydubai.com/events
// A Jibe (iCIMS) careers site with an "Events" menu item. While no events are scheduled, /events just redirects to the
// home page, so we (1) read schema.org Event JSON-LD from /events when it does render, and (2) scan the public
// /api/jobs feed (the same one the job scraper uses) for open-day / assessment-day / walk-in postings, which is how
// flydubai advertises its cabin crew open days by city.
import { EVENT_TITLE, fetchJson, fetchText, mainEvents, stripHtml } from "../lib.mjs";

const BASE = "https://careers.flydubai.com";
const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

function eventType(text) {
  if (/virtual|online/i.test(text)) return "online_drive";
  if (/walk[- ]?in/i.test(text)) return "walk_in";
  if (/open day|open house/i.test(text)) return "open_day";
  if (/assessment|interview|recruitment/i.test(text)) return "interview";
  return "other";
}

// First "12 November 2026" / "November 12, 2026" in the text, so a dated open-day ad lands on the right day.
function findDate(text) {
  const match =
    text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+((?:${MONTHS})[a-z]*),?\\s+(\\d{4})`, "i")) ??
    text.match(new RegExp(`\\b((?:${MONTHS})[a-z]*)\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`, "i"));
  if (!match) return null;
  const [day, month] = /^\d/.test(match[1]) ? [match[1], match[2]] : [match[2], match[1]];
  return `${day} ${month} ${match[3]} 12:00 UTC`;
}

const findTime = (text) => text.match(/\b\d{1,2}(?::\d\d)?\s*(?:am|pm)\b(?:\s*(?:-|–|to)\s*\d{1,2}(?::\d\d)?\s*(?:am|pm))?/i)?.[0];

async function pageEvents() {
  // A redirect (no events) throws in request(); treat that as "nothing listed".
  const html = await fetchText(`${BASE}/events`, { redirect: "manual", retries: 0 }).catch(() => "");
  const events = [];
  for (const [, json] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      continue;
    }
    for (const item of [data, ...(data["@graph"] ?? []), ...(Array.isArray(data) ? data : [])].flat()) {
      if (!/Event$/.test(item?.["@type"] ?? "")) continue;
      const place = item.location ?? {};
      const address = place.address ?? {};
      const text = `${item.name} ${stripHtml(item.description ?? "")}`;
      const url = item.url ?? `${BASE}/events#${encodeURIComponent(`${item.name}-${item.startDate}`)}`;
      events.push({
        title: item.name,
        url,
        event_type: eventType(`${text} ${item.eventAttendanceMode ?? ""}`),
        role: /cabin crew/i.test(text) ? "Cabin Crew" : null,
        city: address.addressLocality,
        country: address.addressCountry?.name ?? address.addressCountry,
        venue: place.name,
        event_date: item.startDate,
        event_time: item.startDate?.match(/T(\d\d:\d\d)/)?.[1],
        apply_url: item.offers?.url ?? url,
        description: item.description,
      });
    }
  }
  return events;
}

async function jobEvents() {
  const events = [];
  for (let page = 1, seen = 0; page <= 50; page++) {
    const { jobs = [], totalCount = 0 } = await fetchJson(`${BASE}/api/jobs?page=${page}&internal=false`);
    for (const { data: job } of jobs) {
      if (!EVENT_TITLE.test(job.title)) continue;
      const text = stripHtml(`${job.title} ${job.description ?? ""}`);
      events.push({
        title: job.title,
        url: `${BASE}/jobs/${job.slug}?lang=${job.language ?? "en-us"}`,
        event_type: eventType(text),
        role: /cabin crew/i.test(text) ? "Cabin Crew" : job.categories?.[0]?.name,
        city: job.city,
        country: job.country,
        venue: job.street_address,
        event_date: findDate(text),
        event_time: findTime(text),
        apply_url: job.apply_url ?? `${BASE}/jobs/${job.slug}`,
        description: job.qualifications || job.description,
      });
    }
    seen += jobs.length;
    if (!jobs.length || seen >= totalCount) break;
  }
  return events;
}

await mainEvents({
  source: "flydubai",
  table: "events_flydubai",
  brand: "flydubai",
  async scrape() {
    return [...(await pageEvents()), ...(await jobEvents())];
  },
});
