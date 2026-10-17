// lufthansa: https://apply.lufthansagroup.careers/index.php?ac=search_result&search_criterion_channel[]=12&language=2
// The portal is a milch & zucker job board whose JS calls api-apply.lufthansagroup.careers/search/?data=<json>;
// we send the same query (publication channel 12, English) and page through it. The API returns no description text.
import { fetchJson, main } from "./lib.mjs";

const API = "https://api-apply.lufthansagroup.careers/search/";
const PAGE_SIZE = 250;
const FIELDS = [
  "ID", "PositionTitle", "PositionURI", "PositionLocation.CityName", "PositionLocation.CountryName",
  "PublicationStartDate", "JobCategory.Name", "PositionSchedule.Name", "PositionOfferingType.Name",
];

await main({
  source: "lufthansa",
  table: "jobs_lufthansa",
  company: "Lufthansa Group",
  async scrape() {
    const jobs = [];
    for (let first = 1; first <= 1000; first += PAGE_SIZE) {
      const query = {
        LanguageCode: "EN",
        SearchParameters: {
          FirstItem: first,
          CountItem: PAGE_SIZE,
          Sort: [{ Criterion: "PublicationStartDate", Direction: "DESC" }],
          MatchedObjectDescriptor: FIELDS,
        },
        SearchCriteria: [{ CriterionName: "PublicationChannel.Code", CriterionValue: ["12"] }],
      };
      const { SearchResult: result } = await fetchJson(`${API}?data=${encodeURIComponent(JSON.stringify(query))}`, {
        headers: { origin: "https://apply.lufthansagroup.careers", referer: "https://apply.lufthansagroup.careers/" },
      });
      for (const { MatchedObjectDescriptor: job } of result?.SearchResultItems ?? []) {
        const names = (list) => (list ?? []).map((item) => item.Name).filter(Boolean);
        const place = job.PositionLocation?.[0];
        jobs.push({
          title: job.PositionTitle,
          url: `${job.PositionURI ?? `https://apply.lufthansagroup.careers/index.php?ac=jobad&id=${job.ID}`}&language=2`,
          location: [place?.CityName, place?.CountryName].filter(Boolean).join(", "),
          description: [names(job.JobCategory).join(", "), ...names(job.PositionSchedule), ...names(job.PositionOfferingType)]
            .filter(Boolean)
            .join(" · "),
          posted_at: job.PublicationStartDate,
        });
      }
      if (first + PAGE_SIZE > (result?.SearchResultCountAll ?? 0)) break;
    }
    return jobs;
  },
});
