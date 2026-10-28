// Fortune Hotels (ITC's Fortune Park chain): https://www.fortunehotels.in/careers/joblisting
// The listing page fills itself from /careers/data?op=job, which returns "success<!--More-->" followed by HTML job
// cards (title, hotel, department, a PDF job description and an apply link). No posting dates.
import { absoluteUrl, decodeEntities, fetchText, main } from "./lib.mjs";

const BASE = "https://www.fortunehotels.in";

await main({
  source: "fortune",
  table: "jobs_fortune",
  company: "Fortune Hotels",
  allowEmpty: true,
  async scrape() {
    const body = await fetchText(`${BASE}/careers/data?op=job`);
    const [status, html = ""] = body.split("<!--More-->");
    if (status.trim() !== "success") throw new Error(`unexpected reply: ${body.slice(0, 80)}`);
    return html.split(/<div class='fortune-job-card'>/).slice(1).map((card) => {
      const value = (label) => card.match(new RegExp(`<strong>${label}:</strong>\\s*([^<]*)`))?.[1]?.trim();
      const apply = card.match(/href='([^']*submitresume[^']*)'/)?.[1];
      const pdf = card.match(/href='([^']+\.pdf)'/i)?.[1];
      const hotel = value("Location");
      return {
        title: decodeEntities(card.match(/job-card-title'>([^<]*)/)?.[1] ?? ""),
        url: apply ? absoluteUrl(apply, BASE) : null,
        location: hotel,
        description: [value("Department"), hotel && `at ${hotel}`, pdf && `Full job description (PDF): ${absoluteUrl(pdf, BASE)}`]
          .filter(Boolean)
          .join(" · "),
      };
    });
  },
});
