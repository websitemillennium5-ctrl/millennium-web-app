// Qatar Airways: https://careers.qatarairways.com/global/SearchJobs?7330=57889&listFilterMode=1
// Avature portal (server-rendered, 6 results per page): parses the result cards and follows jobOffset paging.
// The RSS feed at /SearchJobs/feed/ lacks location and teaser, so the HTML is used instead.
import { fetchText, main, stripHtml } from "./lib.mjs";

const SEARCH = "https://careers.qatarairways.com/global/SearchJobs?7330=57889&listFilterMode=1";

const field = (card, label) =>
  stripHtml(card.match(new RegExp(`${label}:\\s*([^<]+)<`))?.[1] ?? "") || null;

await main({
  source: "qatar_airways",
  table: "jobs_qatar_airways",
  company: "Qatar Airways",
  skipEvents: true, // open days / drives posted as job ads go to the Hiring events page
  async scrape() {
    const jobs = [];
    for (let offset = 0, page = 0; page < 170; page++) {
      const html = await fetchText(`${SEARCH}&jobOffset=${offset}`);
      const cards = html.split(/<article class="article article--result/).slice(1);
      for (const card of cards) {
        const link = card.match(/article__header__text__title[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        if (!link) continue;
        const posted = field(card, "Posting date")?.match(/(\d{2})-(\d{2})-(\d{4})/);
        jobs.push({
          title: link[2],
          url: link[1],
          location: field(card, "Work locations"),
          description: card.match(/article__content--description">([\s\S]*?)<\/div>/)?.[1],
          posted_at: posted ? `${posted[3]}-${posted[2]}-${posted[1]}` : null,
        });
      }
      const total = Number(html.match(/aria-label="(\d+) results"/)?.[1] ?? 0);
      offset += cards.length;
      if (!cards.length || offset >= total || jobs.length >= 1000) break;
    }
    return jobs;
  },
});
