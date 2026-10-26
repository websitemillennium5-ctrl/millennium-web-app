// IndiGo cabin crew hiring events: https://www.goindigo.in/careers/hiringevents/inflightservicesevents.html
// Server-rendered AEM page (Akamai lets fetch through with a browser UA). Each dated card
// ("19th October 2026 - Delhi, Walk In Time : …, Venue : …") is one event; undated city cards and the
// "Click here to apply" grid items are open online-drive registrations and become events too.
import { decodeEntities, fetchText, findDate, mainEvents, mentionsMonth, stripHtml } from "../lib.mjs";

const PAGE = "https://www.goindigo.in/careers/hiringevents/inflightservicesevents.html";
const ROLE = "Cabin Crew";
const LABEL = "Cabin Crew";

const KIND = { walk_in: "walk-in", interview: "interview", online_drive: "online drive" };
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "19th October 2026 - Delhi, Walk In Time : 09:00 am to 12:00 pm, Venue : …" or "Mumbai - 15th October 2026" */
function parseEvent(text) {
  const [head, ...rest] = text.split(",");
  // The date sits in the first part ("19th October 2026 - Delhi"); "October 28, 2026" spills into the next one.
  const found = findDate(head) ?? findDate(text);
  const date = found?.date ?? null;
  // An unreadable date would turn a dated walk-in into an undated online drive that never expires.
  if (!date && mentionsMonth(head)) console.warn(`[indigo] couldn't read the date in "${head}"`);
  const label = (found && head.includes(found.match) ? head.replace(found.match, "") : head).replace(/^\s*-\s*|\s*-\s*$/g, "").trim();
  const details = rest.join(",");
  const time = details.match(/Walk In Time\s*:\s*(.+?)\s*(?:,\s*Venue\b|$)/i)?.[1].replace(/\s+to\s+/i, " – ");
  const venue = details.match(/Venue\s*:\s*(.+)$/i)?.[1].trim();
  // "Gurugram (Hiring for Delhi)" → city Gurugram + note; "PAN INDIA" → no single city
  const [, place, extra] = label.match(/^(.*?)\s*(?:\((.*)\))?$/);
  return { date, label, city: /^pan india$/i.test(place) ? null : place, extra, time, venue, walkIn: /walk\s*in/i.test(details) };
}

function parseCards(html) {
  let intro = stripHtml(html.match(/data-component="drop-html"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
  const events = [];

  for (const [, section] of html.matchAll(/data-component="linkRedirection"[^>]*>([\s\S]*?)<\/section>/g)) {
    const note = stripHtml(section.match(/link-redirection-description">([\s\S]*?)<\/div>/)?.[1] ?? "").replace(/^.*:$/, "") || intro;
    intro = note;
    for (const [, body, action] of section.matchAll(
      /link-redirection-text-icon">([\s\S]*?)<\/div>\s*<div class="link-redirection-action-wrapper">([\s\S]*?)<\/div>/g,
    )) {
      const text = stripHtml(body);
      if (!text) continue;
      const { date, label, city, extra, time, venue, walkIn } = parseEvent(text);
      const apply = action.match(/href="([^"]+)"/)?.[1];
      const type = !date ? "online_drive" : walkIn ? "walk_in" : "interview";
      events.push({
        title: `${LABEL} ${KIND[type]}: ${label}`,
        url: `${PAGE}#${slug(label)}${date ? `-${date}` : ""}`,
        event_type: type,
        role: ROLE,
        city,
        country: "India",
        venue,
        event_date: date,
        event_time: time,
        apply_url: apply ? decodeEntities(apply) : null,
        description: [extra && `${extra}.`, note].filter(Boolean).join(" "),
      });
    }
  }

  for (const [, item] of html.matchAll(/cmp-eventDrives__grid-item">([\s\S]*?)<\/p>\s*<\/div>/g)) {
    const heading = stripHtml(item.match(/cmp-eventDrives__grid-header">([\s\S]*?)<\/div>/)?.[1] ?? "");
    const apply = item.match(/href="([^"]+)"/)?.[1];
    if (!heading || !apply) continue;
    events.push({
      title: `${LABEL} online drive: ${heading}`,
      url: decodeEntities(apply),
      event_type: "online_drive",
      role: ROLE,
      country: "India",
      apply_url: decodeEntities(apply),
      description: [`${heading}.`, intro].filter(Boolean).join(" "),
    });
  }
  return events;
}

await mainEvents({
  source: "indigo_cabin_crew",
  table: "events_indigo_cabin_crew",
  brand: "IndiGo",
  async scrape() {
    return parseCards(await fetchText(PAGE, { headers: { accept: "text/html,application/xhtml+xml" } }));
  },
});
