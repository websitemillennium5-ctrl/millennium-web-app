// TravelTriangle (Holiday Triangle Travel, Gurgaon): https://traveltriangle.com/career
// The React page is server-rendered with its Redux store in an inline `window.__data = {...}` script; the openings
// sit at trialist.jobDescription.data.careers, grouped by team, each with responsibilities, skills, experience, city,
// education and pay. The server only sometimes renders the store with the openings loaded (the browser otherwise fills
// them from an API that robots.txt disallows), so the page is fetched again until a loaded copy comes back. Every role
// has its own /career/<id> page; applications go by email to hr@traveltriangle.com.
import { fetchText, main } from "./lib.mjs";

const SITE = "https://traveltriangle.com";
const PAGE = `${SITE}/career`;
const ATTEMPTS = 8; // about one in three server renders carries the openings

/** Collapses the "\r\n\r\n1. …" line breaks in a store field to one line. */
const flat = (text) => (text ? String(text).replace(/\s+/g, " ").trim() : "");

await main({
  source: "travel_triangle",
  table: "jobs_travel_triangle",
  company: "TravelTriangle",
  allowEmpty: true,
  async scrape() {
    let groups = null;
    for (let attempt = 0; attempt < ATTEMPTS && !groups; attempt++) {
      const html = await fetchText(PAGE);
      const start = html.indexOf("window.__data=");
      const end = start < 0 ? -1 : html.indexOf("</script>", start);
      if (end < 0) throw new Error("no window.__data store on the page (site changed?)");
      const store = JSON.parse(html.slice(start + "window.__data=".length, end).trim().replace(/;$/, ""));
      if (store?.trialist?.jobDescription?.loaded) groups = store.trialist.jobDescription.data?.careers ?? {};
    }
    // Never got a loaded copy: treat it like an outage so the current listings are kept rather than cleared
    if (!groups) throw Object.assign(new Error(`openings not rendered in ${ATTEMPTS} tries`), { unavailable: true });

    return Object.values(groups)
      .flat()
      .filter((job) => job?.id && job.subCategory)
      .map((job) => {
        const title = flat(job.subCategory);
        const team = flat(job.category);
        const facts = [
          team !== title ? team : null,
          job.experience && `${flat(job.experience)} experience`,
          flat(job.education) || null,
          job.location && `at ${flat(job.location)}`,
        ]
          .filter(Boolean)
          .join(" · ");
        const prose = [flat(job.rolesAndResponsibities), flat(job.whatYouGet) && `What you get: ${flat(job.whatYouGet)}`].filter(Boolean).join(" ");
        return {
          title,
          url: `${PAGE}/${job.id}`,
          location: flat(job.location) || null,
          description: prose ? `${facts} — ${prose}` : facts,
        };
      });
  },
});
