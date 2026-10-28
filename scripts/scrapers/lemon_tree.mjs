// Lemon Tree Hotels: https://careers.lemontreehotels.com/current-openings
// One server-rendered page listing every opening (title, city, hotel). Applications go through a pop-up form on the
// same page, so each job's URL is that page plus a #job-<id> fragment. Often only a handful of roles are listed.
import { decodeEntities, fetchText, main } from "./lib.mjs";

const PAGE = "https://careers.lemontreehotels.com/current-openings";

await main({
  source: "lemon_tree",
  table: "jobs_lemon_tree",
  company: "Lemon Tree Hotels",
  allowEmpty: true,
  async scrape() {
    const html = (await fetchText(PAGE)).replace(/\s+/g, " ");
    return html.split(/<div class="single_jobs/).slice(1).map((card) => {
      const id = card.match(/data-id="(\d+)"/)?.[1];
      const city = card.match(/fa-map-marker"><\/i>\s*([^<]*)</)?.[1]?.trim();
      const hotel = card.match(/fa-hotel'\s*><\/i>\s*([^<]*)</)?.[1]?.trim();
      return {
        title: decodeEntities(card.match(/data-title="([^"]*)"/)?.[1] ?? ""),
        url: `${PAGE}#job-${id}`,
        location: [...new Set([hotel, city].filter(Boolean))].join(", ") || null,
        description: card.match(/job_des">\s*(.*?)\s*<\/div>/)?.[1] || (hotel && `at ${hotel}`) || null,
      };
    });
  },
});
