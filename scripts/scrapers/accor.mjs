// Accor (India): https://careers.accor.com/global/en/india
// Attrax career site, 50 server-rendered tiles a page under the India landing page. Tiles carry title, hotel + city,
// brand, category, schedule and a description teaser; there are too many jobs to open each page for its posting date.
import { main, scrapeAttrax } from "./lib.mjs";

const LIST = "https://careers.accor.com/global/en/india";

await main({
  source: "accor",
  table: "jobs_accor",
  company: "Accor",
  async scrape() {
    const tiles = await scrapeAttrax(LIST);
    return tiles.map(({ title, url, location, description, fields }) => {
      const brand = fields["option-brands"];
      return {
        title,
        url,
        company: brand && brand.toUpperCase() !== "ACCOR" ? brand : "Accor",
        location: location || fields["option-locations"] || null,
        description: [fields["option-job-category"], fields["option-job-schedule"], fields["option-experience-level"], description]
          .filter(Boolean)
          .join(" · "),
      };
    });
  },
});
