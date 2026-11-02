// Expedia Group (India): https://careers.expediagroup.com/jobs/?filter%5Bcountry%5D=India
// WordPress site with the Appcast job-search plugin: the first 25 cards (title, "India - State - City", job family) are
// server-rendered; further pages come from /calc-results/?…&mypage=N. Each job page embeds a schema.org JobPosting,
// which supplies the posting date, employment type and description. (The site's own ?location= parameter is ignored.)
import { absoluteUrl, decodeEntities, fetchJobPosting, fetchText, main, mapLimit } from "./lib.mjs";

const BASE = "https://careers.expediagroup.com";
const QUERY = "filter%5Bcountry%5D=India";
const CONCURRENCY = 2; // the site answers "Too many requests" to bursts

/** The job cards in a listing page or a calc-results fragment. */
function parseCards(html) {
  const cards = [];
  for (const card of html.split(/<li class="Results__list__item">/).slice(1)) {
    const m = card.match(/<a href="([^"]+)" class="view-job-button">\s*<h3[^>]*>\s*([^<]+?)\s*<\/h3>\s*<h4[^>]*>([^<]*)<\/h4>\s*(?:<p>([^<]*)<\/p>)?/);
    if (!m) continue;
    cards.push({
      url: absoluteUrl(m[1], BASE),
      title: decodeEntities(m[2]),
      location: decodeEntities(m[3]).replace(/^India\s*-\s*/, "").split(/\s*-\s*/).reverse().join(", ") || "India", // "India - Haryāna - Gurgaon" → "Gurgaon, Haryāna"
      category: decodeEntities(m[4] ?? ""),
    });
  }
  return cards;
}

await main({
  source: "expedia",
  table: "jobs_expedia",
  company: "Expedia Group",
  async scrape() {
    const first = await fetchText(`${BASE}/jobs/?${QUERY}`);
    const cards = parseCards(first);
    const pages = Number(first.match(/numpages = "(\d+)"/)?.[1] ?? 1);
    for (let page = 1; page < pages; page++) {
      // The "Load More Jobs" button's request; pages are zero-based here and the server rate-limits bursts.
      try {
        cards.push(...parseCards(await fetchText(`${BASE}/calc-results/?${QUERY}&mypage=${page}`)));
      } catch (error) {
        console.error(`[expedia] page ${page + 1} of ${pages} unavailable, keeping the ${cards.length} jobs read so far: ${error.message}`);
        break;
      }
    }

    return mapLimit(cards, CONCURRENCY, async (card) => {
      const posting = await fetchJobPosting(card.url);
      const type = [posting?.employmentType].flat().filter(Boolean).map((t) => t.toLowerCase().replace(/_/g, "-")).join(" / ");
      // Every posting opens with the same "At Expedia Group, we help travelers…" paragraph; the card is better without it
      const description = posting?.description?.replace(/^\s*<p>\s*At Expedia Group, we help travelers[\s\S]*?<\/p>/, "").trim();
      return {
        title: card.title,
        url: card.url,
        location: card.location,
        description: description || [card.category, type, `at Expedia Group, ${card.location}`].filter(Boolean).join(" · "),
        posted_at: posting?.datePosted ?? null,
      };
    });
  },
});
