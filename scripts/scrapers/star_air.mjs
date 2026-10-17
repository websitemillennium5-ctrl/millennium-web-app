// Star Air: https://www.starair.in/careers
// Server-rendered ASP.NET table of openings (job id, title, area, location); each row links to a CareerView
// detail page, which we fetch for the requirements/responsibilities text.
import { absoluteUrl, fetchText, main, stripHtml } from "./lib.mjs";

const CAREERS = "https://www.starair.in/careers";

// Detail pages are double-encoded (UTF-8 read as cp1252), e.g. "&#226;€™" for "’".
const MOJIBAKE = { "â€™": "’", "â€˜": "‘", "â€œ": "“", "â€\u009d": "”", "â€”": "—", "â€“": "–", "â€¢": "•" };
const fixMojibake = (text) => text.replace(/â€./g, (m) => MOJIBAKE[m] ?? m);

async function detail(url) {
  try {
    const html = await fetchText(url);
    const parts = [...html.matchAll(/class="line-breaks">([\s\S]*?)<\/(?:p|span)>/g)].map((m) => stripHtml(m[1]));
    return fixMojibake(parts.join(" "));
  } catch {
    return null;
  }
}

await main({
  source: "star_air",
  table: "jobs_star_air",
  company: "Star Air",
  async scrape() {
    const html = await fetchText(CAREERS);
    const rows = [...html.matchAll(/<tr[^>]*>\s*<td[^>]*>([^<]*)<\/td>\s*<td><a href="([^"]*CareerView[^"]*)"[^>]*>([\s\S]*?)<\/a><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)];
    return Promise.all(
      rows.map(async ([, , href, title, area, location]) => {
        const url = absoluteUrl(href, CAREERS);
        const body = await detail(url);
        return { title, url, location, description: [stripHtml(area), body].filter(Boolean).join(" · ") };
      }),
    );
  },
});
