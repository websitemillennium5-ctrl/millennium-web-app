// IHCL / Taj Hotels (India): https://careers.ihcltata.com/search/?q=india
// SuccessFactors career site, same layout as Air India's: pages the HTML search tiles with startrow and reads each
// tile's hotel, department and posting date. Several hundred jobs, so job pages aren't opened for descriptions.
import { absoluteUrl, decodeEntities, fetchText, findDate, main } from "./lib.mjs";

const BASE = "https://careers.ihcltata.com";

const field = (html, id, name) => html.match(new RegExp(`id="job-${id}-desktop-section-${name}-value">([^<]*)`))?.[1]?.trim();

await main({
  source: "ihcl",
  table: "jobs_ihcl",
  company: "IHCL",
  async scrape() {
    const jobs = [];
    for (let startrow = 0; startrow < 2000; ) {
      const html = await fetchText(`${BASE}/search/?createNewAlert=false&q=india&startrow=${startrow}`);
      const total = Number(html.match(/Showing \d+ to \d+ of (\d+) Jobs/)?.[1] ?? 0);
      const tiles = [...html.matchAll(/<li class="job-tile job-id-(\d+)[^"]*" data-url="([^"]+)"/g)];
      for (const [, id, href] of tiles) {
        const title = html.match(new RegExp(`data-focus-tile="\\.job-id-${id}"[^>]*href="[^"]*">\\s*([^<]+?)\\s*</a>`))?.[1];
        const hotel = field(html, id, "businessunit");
        const city = field(html, id, "city");
        const dept = field(html, id, "dept");
        jobs.push({
          title: decodeEntities(title ?? ""),
          url: absoluteUrl(href, BASE),
          location: [...new Set([hotel, city].filter(Boolean))].join(", ") || null,
          description: [dept, hotel && `at ${hotel}`].filter(Boolean).join(" · "),
          posted_at: findDate(field(html, id, "date") ?? "")?.date,
        });
      }
      startrow += tiles.length;
      if (!tiles.length || startrow >= total) break;
    }
    return jobs;
  },
});
