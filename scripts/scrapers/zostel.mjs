// Zostel (backpacker hostel chain): https://www.zostel.com/career#open-positions
// The Next.js page streams its React Server Components payload through inline self.__next_f.push() scripts; the
// "Join Our Team" grid is the `jobOpenings` array in that payload (id, slug, title, short/long description, years of
// experience, deadline, apply link). Long descriptions are "$<ref>" pointers to text chunks elsewhere in the same
// payload. Each role has its own /career/<slug> page; property roles are hired by the franchise partner.
import { fetchText, main } from "./lib.mjs";

const SITE = "https://www.zostel.com";
const PAGE = `${SITE}/career`;

/** All the RSC payload strings pushed by the page's inline scripts, joined in order. */
function rscPayload(html) {
  let payload = "";
  for (const [, literal] of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      payload += JSON.parse(literal);
    } catch {
      // a chunk we can't read is just skipped
    }
  }
  return payload;
}

/** The first JSON array that follows `"<key>":` in the payload, matched bracket by bracket. */
function arrayAfter(payload, key) {
  const start = payload.indexOf(`"${key}":[`);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start + key.length + 3; i < payload.length; i++) {
    if (payload[i] === "[") depth++;
    else if (payload[i] === "]" && --depth === 0) {
      try {
        return JSON.parse(payload.slice(start + key.length + 3, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** A "$ref" value → the text chunk `<ref>:T<hex byte length>,<text>` it points at, or null. */
function resolveText(payload, value) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("$")) return value;
  const m = payload.match(new RegExp(`(?:^|\\n)${value.slice(1)}:T([0-9a-f]+),`));
  if (!m) return null;
  return Buffer.from(payload.slice(m.index + m[0].length)).subarray(0, parseInt(m[1], 16)).toString();
}

/** "2026-12-30T18:30:00Z" → "30 Dec 2026", the calendar day the site prints (it shows the UTC date). */
const applyBy = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null);

await main({
  source: "zostel",
  table: "jobs_zostel",
  company: "Zostel",
  allowEmpty: true,
  async scrape() {
    const payload = rscPayload(await fetchText(PAGE));
    const openings = arrayAfter(payload, "jobOpenings");
    if (!openings) throw new Error("no jobOpenings in the page payload (site changed?)");

    return openings
      .filter((job) => job.slug && job.title)
      .map((job) => {
        const places = (job.destinations ?? []).map((d) => (typeof d === "string" ? d : d?.name)).filter(Boolean);
        const facts = [
          job.experience ? `${job.experience}+ ${job.experience === 1 ? "year" : "years"} experience` : null,
          job.deadline && `apply by ${applyBy(job.deadline)}`,
          places.length ? `at ${places.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const prose = resolveText(payload, job.long_description) || job.short_description || "";
        return {
          title: job.title,
          url: `${PAGE}/${job.slug}`,
          location: places.join(", ") || null,
          description: prose ? `${facts} — ${prose}` : facts,
          posted_at: job.time_created,
        };
      });
  },
});
