// Qatar Airways: https://careers.qatarairways.com/global/SearchJobs/Cabin%20Crew%20Recruitment?listFilterMode=1
// Qatar has no events calendar: each cabin crew recruitment drive is an Avature posting titled
// "Cabin Crew Recruitment | <City>, <Country> | <Year>" (apply online, shortlisted candidates are invited to the assessment).
// Runs a few keyword searches, keeps event-style titles and reads the date from the posting when one is given.
import { EVENT_TITLE, fetchText, mainEvents, stripHtml } from "../lib.mjs";

const BASE = "https://careers.qatarairways.com/global";
const QUERIES = ["Cabin Crew Recruitment", "Open Day", "Assessment Day", "Recruitment Event", "Roadshow"];
const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

await mainEvents({
  source: "qatar_airways",
  table: "events_qatar_airways",
  brand: "Qatar Airways",
  async scrape() {
    const postings = new Map();
    for (const query of QUERIES) {
      for (let offset = 0; offset < 60; offset += 6) {
        const html = await fetchText(`${BASE}/SearchJobs/${encodeURIComponent(query)}?listFilterMode=1&jobOffset=${offset}`);
        const links = [...html.matchAll(/article__header__text__title[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
        for (const [, url, title] of links) if (EVENT_TITLE.test(stripHtml(title))) postings.set(url, stripHtml(title));
        if (links.length < 6) break;
      }
    }

    const events = [];
    for (const [url, title] of postings) {
      const text = stripHtml(await fetchText(url));
      const body = text.slice(text.indexOf("Description"), text.indexOf("About Qatar Airways Group"));
      const place = title.split("|").map((part) => part.trim()).find((part) => part.includes(",")) ?? "";
      const [city, country] = place.split(/,\s*(?=[^,]+$)/);
      // Event date, when the posting gives one (e.g. "on 12 November 2026" / "November 12, 2026").
      const date = body.match(new RegExp(`\\b\\d{1,2}(st|nd|rd|th)?\\s+(${MONTHS})[a-z]*,?\\s+20\\d\\d|\\b(${MONTHS})[a-z]*\\s+\\d{1,2}(st|nd|rd|th)?,?\\s+20\\d\\d`, "i"))?.[0];
      const role = /cabin crew/i.test(title) ? "Cabin Crew" : title.split("|")[0].trim();
      events.push({
        title: `${role} recruitment: ${city || title}`,
        url,
        event_type: /open day|walk[- ]in/i.test(title) ? "open_day" : "interview",
        role,
        city,
        country,
        event_date: date ? new Date(`${date.replace(/(st|nd|rd|th),?/, "")} UTC`) : null,
        apply_url: url,
        description: `Apply online; shortlisted candidates are invited to the recruitment event. ${
          body.match(/(Qualification|Essential qualifications)[\s\S]*?(?=Ready for|$)/)?.[0]?.replace(/^\S+\s+(Is This You\?\s*)?/, "") ?? ""
        }`,
      });
    }
    return events;
  },
});
