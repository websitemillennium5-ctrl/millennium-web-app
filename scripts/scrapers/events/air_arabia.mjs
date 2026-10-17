// Air Arabia: https://www.airarabiagroupcareers.com/gb/en/events
// Phenom People site: the events page POSTs to /widgets with ddoKey "eventSearch" (Phenom CRM events: open days and
// recruitment events). Each event has its own /event/<scheduleId>/<slug> page with the registration form; the list only
// carries a teaser, so we read the full description from that page's inline phApp.ddo.eventDetail.
// Some cabin crew open days / recruitment drives are posted as job ads instead ("Cabin Crew - Open Day Karachi"),
// so we also pick event-style titles out of the job search, skipping countries the events page already covers.
import { EVENT_TITLE, fetchJson, fetchText, mainEvents, toDate } from "../lib.mjs";

const BASE = "https://www.airarabiagroupcareers.com";
const SIZE = 50;
const MAX_DETAIL_PAGES = 30;

const slug = (title) => title.normalize("NFKD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
// "2026-10-29T09:00:00+01:00" is already in the event's local time zone, so read the parts as written.
const localTime = (iso) => iso?.match(/T(\d\d:\d\d)/)?.[1];

async function fullDescription(url) {
  const html = await fetchText(url).catch(() => "");
  try {
    return JSON.parse(html.match(/phApp\.ddo\s*=\s*(\{[\s\S]*?\});\s*phApp/)?.[1] ?? "null")?.eventDetail?.data?.description;
  } catch {
    return null;
  }
}

function eventType(event, text) {
  if (event.eIsOnline || event.eisOnline) return "online_drive";
  if (/open day|open house/i.test(text)) return "open_day";
  if (/walk[- ]?in/i.test(text) && !/not a walk[- ]?in/i.test(text)) return "walk_in";
  if (/interview|recruitment|assessment|hiring/i.test(text)) return "interview";
  return "other";
}

const widgets = (body) =>
  fetchJson(`${BASE}/widgets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lang: "en_gb", deviceType: "desktop", country: "gb", siteType: "external", size: SIZE, ...body }),
  });

/** Event-style job ads. The ads give a month at most ("October 2026"), so event_date stays empty. */
async function eventJobAds(coveredCountries) {
  const ads = [];
  for (let from = 0; from < 1000; from += SIZE) {
    const { refineSearch } = await widgets({
      pageName: "search-results",
      ddoKey: "refineSearch",
      pageId: "page21",
      global: true,
      jobs: true,
      counts: false,
      keywords: "",
      selected_fields: {},
      from,
    });
    const page = refineSearch?.data?.jobs ?? [];
    for (const job of page) {
      if (!EVENT_TITLE.test(job.title) || coveredCountries.has(job.country)) continue;
      const url = `${BASE}/gb/en/job/${job.jobId}/${slug(job.title)}`;
      ads.push({
        title: job.title,
        url,
        event_type: /open day|open house/i.test(job.title) ? "open_day" : /walk[\s-]?in/i.test(job.title) ? "walk_in" : "interview",
        role: job.category,
        city: job.city,
        country: job.country,
        apply_url: url,
        description: `${job.descriptionTeaser ?? ""} Posted ${toDate(job.postedDate) ?? ""}. Venue and schedule are shared with applicants before the event.`,
      });
    }
    if (page.length < SIZE || from + SIZE >= (refineSearch?.totalHits ?? 0)) break;
  }
  return ads;
}

await mainEvents({
  source: "air_arabia",
  table: "events_air_arabia",
  brand: "Air Arabia",
  async scrape() {
    const events = [];
    for (let from = 0; from < 500; from += SIZE) {
      const { eventSearch } = await widgets({ pageName: "events", ddoKey: "eventSearch", pageId: "page19", from });
      const page = eventSearch?.data?.events ?? [];
      for (const event of page) {
        const id = event.eventScheduleId ?? event.mongoId;
        const place = (event.eLocation ?? event.elocation)?.[0] ?? {};
        const url = `${BASE}/gb/en/event/${id}/${slug(event.title)}`;
        const teaser = (event.teaser ?? "").replace(/\.{3,}$/, "…");
        const description = (events.length < MAX_DETAIL_PAGES && (await fullDescription(url))) || teaser;
        const [start, end] = [localTime(event.eStartDate), localTime(event.eEndDate)];
        const lastDay = event.eEndDate?.slice(0, 10);
        events.push({
          title: event.title,
          url,
          event_type: eventType(event, `${event.title} ${description}`),
          role: event.category,
          city: place.city,
          country: place.country,
          venue: event.eIsOnline ? "Online" : place.address1 || place.location,
          event_date: event.eStartDate?.slice(0, 10),
          event_time: [
            start && end ? `${start}–${end}` : start,
            lastDay && lastDay !== event.eStartDate?.slice(0, 10) ? `until ${lastDay}` : null,
            event.eTimeZone,
          ].filter(Boolean).join(", "),
          apply_url: url,
          description,
        });
      }
      if (page.length < SIZE || from + SIZE >= (eventSearch?.total ?? 0)) break;
    }
    return [...events, ...(await eventJobAds(new Set(events.map((e) => e.country))))];
  },
});
