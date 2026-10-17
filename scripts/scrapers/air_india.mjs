// Air India: https://careers.airindia.com/search/
// SuccessFactors career site (RSS feed errors out): pages the HTML search tiles with startrow, then reads each
// job page's schema.org datePosted/description while the list is small.
import { absoluteUrl, decodeEntities, fetchText, main } from "./lib.mjs";

const BASE = "https://careers.airindia.com";
const DETAIL_LIMIT = 60;

const field = (html, id, name) =>
  html.match(new RegExp(`id="job-${id}-desktop-section-${name}-value">([^<]*)`))?.[1]?.trim();

await main({
  source: "air_india",
  table: "jobs_air_india",
  company: "Air India",
  skipEvents: true, // open days / drives posted as job ads go to the Hiring events page
  async scrape() {
    const jobs = [];
    for (let startrow = 0; startrow < 1000; ) {
      const html = await fetchText(`${BASE}/search/?createNewAlert=false&q=&locationsearch=&startrow=${startrow}`);
      const total = Number(html.match(/Showing \d+ to \d+ of (\d+) Jobs/)?.[1] ?? 0);
      const tiles = [...html.matchAll(/<li class="job-tile job-id-(\d+)[^"]*" data-url="([^"]+)"/g)];
      for (const [, id, href] of tiles) {
        const title = html.match(new RegExp(`data-focus-tile="\\.job-id-${id}"[^>]*href="[^"]*">\\s*([^<]+?)\\s*</a>`))?.[1];
        jobs.push({
          title: decodeEntities(title ?? ""),
          url: absoluteUrl(href, BASE),
          location: field(html, id, "city"),
          department: field(html, id, "dept"),
        });
      }
      startrow += tiles.length;
      if (!tiles.length || startrow >= total) break;
    }

    if (jobs.length <= DETAIL_LIMIT) {
      for (const job of jobs) {
        const html = await fetchText(job.url).catch(() => "");
        job.posted_at = html.match(/itemprop="datePosted" content="([^"]+)"/)?.[1];
        job.description =
          html.match(/itemprop="description"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/)?.[1] || job.department;
      }
    }
    return jobs.map(({ department, ...job }) => ({ description: department, ...job }));
  },
});
