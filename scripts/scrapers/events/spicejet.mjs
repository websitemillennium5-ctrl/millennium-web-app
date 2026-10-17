// SpiceJet cabin crew interviews: https://corporate.spicejet.com/careers.aspx
// Static ASP.NET page with no job board; the only listings are the monthly "Cabin Crew Interview <Month> Calendar"
// tables. Each interview date becomes one event, with the table's timings & venue and the page's eligibility criteria.
import { fetchText, mainEvents, stripHtml } from "../lib.mjs";

const PAGE = "https://corporate.spicejet.com/careers.aspx";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const TIME_RE = /^\d{1,2}(?::\d{2})?\s*[ap]m\s*[-–]\s*\d{1,2}(?::\d{2})?\s*[ap]m$/i;

/** "21-Oct-26" → "2026-10-21" */
function parseDate(text) {
  const [, day, mon, year] = text.match(/(\d{1,2})-([a-z]{3})-(\d{2,4})/i) ?? [];
  const month = MONTHS.indexOf(mon?.toLowerCase());
  if (month < 0) return null;
  return `${year.length === 2 ? `20${year}` : year}-${String(month + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const CAREERS_EMAIL = "careers@spicejet.com";

/** A pre-filled email draft to SpiceJet careers for one interview date. */
function applyEmail(city, date) {
  const day = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const subject = `Application: Cabin Crew interview, ${city} (${day})`;
  const body = [
    "Dear SpiceJet Careers Team,",
    "",
    `I would like to apply for the Cabin Crew interview in ${city} on ${day}. My CV is attached.`,
    "",
    "Name:",
    "Phone:",
    "Age:",
    "Height:",
    "Qualification:",
    "",
    "Thank you.",
  ].join("\n");
  return `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

await mainEvents({
  source: "spicejet",
  table: "events_spicejet",
  brand: "SpiceJet",
  async scrape() {
    const html = await fetchText(PAGE);
    const eligibility = stripHtml(html.match(/eligibility criteria is listed below:([\s\S]*?)Disclaimer/i)?.[1] ?? "");
    const events = [];

    for (const [, table] of html.matchAll(/Cabin Crew Interview [a-z]+ Calendar([\s\S]*?)<\/table>/gi)) {
      // "9am-2pm , Spice Star Academy,SpiceJet Ltd. Building- 363 , …,Gurugram, Haryana -122016"
      const parts = stripHtml(table.match(/<td[^>]*rowspan[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "").split(",").map((part) => part.trim());
      const time = TIME_RE.test(parts[0]) ? parts.shift().replace(/\s*[-–]\s*/, " – ") : null;
      const city = parts.length > 2 ? parts.at(-2) : "Gurugram";
      for (const [text] of table.matchAll(/\d{1,2}-[a-z]{3}-\d{2,4}/gi)) {
        const date = parseDate(text);
        if (!date) continue;
        events.push({
          title: `Cabin Crew interview: ${city}`,
          url: `${PAGE}#cabin-crew-${date}`,
          event_type: "interview",
          role: "Cabin Crew",
          city,
          country: "India",
          venue: parts.join(", ") || null,
          event_date: date,
          event_time: time,
          // The page's own "register" link is Spice Star Academy's admission form, so applicants email SpiceJet instead
          apply_url: applyEmail(city, date),
          description: [eligibility && `Freshers and experienced crew. ${eligibility}`].filter(Boolean).join(" "),
        });
      }
    }
    return events;
  },
});
