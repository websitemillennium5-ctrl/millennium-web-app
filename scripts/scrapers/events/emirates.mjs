// Emirates: https://www.emiratesgroupcareers.com/cabin-crew/
// The cabin crew page server-renders every upcoming recruitment event as a `cc_events_item` card ("Open day" walk-ins with a
// venue, and "Invite only" assessment days for online applicants). Cards show "17 Oct" with no year, so the year is inferred.
// Online information sessions are linked to Avature EventDetail pages, which carry the full date and time.
import { fetchText, mainEvents, stripHtml } from "../lib.mjs";

const PAGE = "https://www.emiratesgroupcareers.com/cabin-crew/";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const ELIGIBILITY =
  "Age 21+, at least 160cm tall with 212cm arm reach, fluent English, high school (Grade 12), 1+ year hospitality or customer service experience, no visible tattoos in uniform. Bring a valid ID plus digital copies of your CV in English, education certificate and passport.";

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cleanApply = (href) => {
  const jobId = href.match(/jobId=(\d+)/)?.[1];
  return jobId ? `https://emiratesjobs.avature.net/careersmarketplace/ApplicationMethods?jobId=${jobId}&source=CareerWebsite` : PAGE;
};

/** "17 Oct" → the next YYYY-MM-DD on or after ~2 months ago (cards roll off once past). */
function inferDate(text) {
  const [, day, mon] = text.match(/(\d{1,2})\s+([a-z]{3})/i) ?? [];
  const month = MONTHS.indexOf(mon?.toLowerCase());
  if (month < 0) return null;
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), month, Number(day)));
  if (date < now - 60 * 864e5) date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

await mainEvents({
  source: "emirates",
  table: "events_emirates",
  brand: "Emirates",
  async scrape() {
    const html = await fetchText(PAGE);
    const events = [];

    for (const section of html.split(/upcoming_event_section">/).slice(1)) {
      const label = stripHtml(section.match(/upcoming_event-heading[\s\S]*?<span[^>]*>([^<]+)</)?.[1] ?? "");
      const intro = stripHtml(section.match(/e-msg[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
      const apply = section.match(/event-apply-cta">\s*<a href="([^"]+)"/)?.[1];
      const inviteOnly = /invite/i.test(label);
      for (const card of section.split(/<div class="cc_events_item"/).slice(1)) {
        const place = stripHtml(card.match(/class="_country">([^<]+)</)?.[1] ?? "");
        const [city, country] = place.split(/,\s*(?=[^,]+$)/);
        const when = stripHtml(card.match(/class="_date[^"]*"><span[^>]*>([^<]*)</)?.[1] ?? "");
        const time = stripHtml(card.match(/class="_time">([^<]*)</)?.[1] ?? "");
        const venue = stripHtml(card.match(/class="_pin_link">([\s\S]*?)<\/a>/)?.[1] ?? "");
        const date = inferDate(when);
        events.push({
          title: `Cabin Crew ${inviteOnly ? "assessment day (invite only)" : "open day"}: ${city}`,
          url: `${PAGE}#${slug(`${inviteOnly ? "invite" : "open-day"} ${place} ${date ?? "ongoing"}`)}`,
          event_type: inviteOnly ? "interview" : "open_day",
          role: "Cabin Crew",
          city,
          country: country ?? card.match(/data-country="([^"]+)"/)?.[1],
          venue: venue || null,
          event_date: date,
          event_time: time || (date ? null : when),
          apply_url: cleanApply(apply ?? ""),
          description: `${intro} ${ELIGIBILITY}`,
        });
      }
    }

    // Online information sessions: one Avature EventDetail link per session date.
    const links = [...new Set([...html.matchAll(/href="(https:\/\/external\.emiratesgroupcareers\.com\/[^"]*EventDetail\?eventId=\d+[^"]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&")))];
    for (const link of links) {
      const detail = stripHtml(await fetchText(link));
      const title = detail.split(" - ")[0];
      const [, day, time] = detail.match(/Start Date & Time:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})\s+([\d:apm\s-]+?)\s+End/) ?? [];
      const field = (label, next) => detail.match(new RegExp(`${label}\\s+(.+?)\\s+${next}`))?.[1];
      const url = link.replace(/&tags=.*$/, "");
      events.push({
        title,
        url,
        event_type: "online_drive",
        role: "Cabin Crew",
        city: field("City", "Country"),
        country: field("Country", "Description"),
        venue: "Online",
        event_date: day ? new Date(`${day} UTC`) : null,
        event_time: time,
        apply_url: url.replace("EventDetail", "EventRegister"),
        description: detail.match(/Description\s+(.+?)\s+(Requirements|Back Register)/)?.[1],
      });
    }
    return events;
  },
});
