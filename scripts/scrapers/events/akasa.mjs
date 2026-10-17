// Akasa Air: https://careers-akasa.peoplestrong.com/job/joblist
// Akasa runs cabin crew hiring as "walk-in drives" or "virtual interviews" (akasaair.com crew careers page) and posts
// each one as a PeopleStrong requisition, e.g. "Cabin Crew Virtual Interviews - PAN India". Reads the same public
// jobs/v1 list as the job scraper, keeps event-titled postings and pulls eligibility from the job/<code>/v2 detail.
// Rolling drives without a set day use the posting's closing date as event_date.
import { EVENT_TITLE, fetchJson, mainEvents, stripHtml } from "../lib.mjs";

const API = "https://careers-akasa.peoplestrong.com/api/cp/rest/altone/cp";
const LIMIT = 50;
const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

/** First date in free text: "12th Nov 2026", "November 12, 2026", "12/11/2026" (day first). */
function findDate(text) {
  const ymd = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const month = (name) => MONTHS.split("|").indexOf(name.slice(0, 3).toLowerCase()) + 1;
  const dmy = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTHS})[a-z]*,?\\s+(20\\d\\d)`, "i"));
  if (dmy) return ymd(dmy[3], month(dmy[2]), dmy[1]);
  const mdy = text.match(new RegExp(`\\b(${MONTHS})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)`, "i"));
  if (mdy) return ymd(mdy[3], month(mdy[1]), mdy[2]);
  const num = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d\d)\b/);
  return num ? ymd(num[3], num[2], num[1]) : null;
}

const findTime = (text) =>
  text.match(/\b\d{1,2}(?:[:.]\d{2})?\s?[ap]\.?m\.?(?:\s*(?:-|–|to)\s*\d{1,2}(?:[:.]\d{2})?\s?[ap]\.?m\.?)?/i)?.[0];
const findVenue = (text) => text.match(/\bvenue\s*[:\-–]\s*(.{5,200}?)(?:\.\s|\b(?:date|time|reporting)\b|$)/i)?.[1];

function eventType(text) {
  if (/walk[\s-]?in/i.test(text)) return "walk_in";
  if (/open (?:day|house)/i.test(text)) return "open_day";
  if (/virtual|online|video/i.test(text)) return "online_drive";
  return "interview";
}

async function details(code) {
  const { response } = await fetchJson(`${API}/job/${code}/v2?part=basic,descriprion&isReqId=false`).catch(() => ({}));
  return stripHtml(response?.jobDescription ?? "");
}

await mainEvents({
  source: "akasa",
  table: "events_akasa",
  brand: "Akasa Air",
  async scrape() {
    const postings = [];
    for (let offset = 0; offset < 1000; offset += LIMIT) {
      const { totalRecords = 0, response = [] } = await fetchJson(`${API}/jobs/v1?offset=${offset}&limit=${LIMIT}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      postings.push(...response);
      if (response.length < LIMIT || offset + LIMIT >= totalRecords) break;
    }

    const events = [];
    for (const job of postings.filter((job) => EVENT_TITLE.test(job.jobTitle ?? ""))) {
      const title = job.jobTitle.trim();
      const text = await details(job.jobDetailUrl.split("/").pop());
      const date = findDate(title) ?? findDate(text);
      // "Cabin Crew Virtual Interviews - PAN India" → where = "PAN India"
      const where = title.split(/\s+[-–]\s+/).slice(1).join(" - ") || job.locationHierarchy;
      const remote = /pan india|virtual|online/i.test(title);
      events.push({
        title: where ? `${title.split(/\s+[-–]\s+/)[0]}: ${where}` : title,
        url: job.jobDetailUrl,
        event_type: eventType(title),
        role: job.designation || title,
        city: remote ? where : job.locationHierarchy,
        country: "India",
        venue: findVenue(text) ?? (remote ? "Online" : null),
        event_date: date ?? job.jobClosureDate,
        event_time: date ? findTime(text) : job.jobClosureDate && `Rolling, apply by ${job.jobClosureDate}`,
        apply_url: job.jobDetailUrl,
        description: text.match(/Requirements?\b[\s\S]*?(?=Akasa Air does not solicit|$)/i)?.[0] || text,
      });
    }
    return events;
  },
});
