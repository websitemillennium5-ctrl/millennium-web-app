// Sterling Holiday Resorts: https://www.sterlingholidays.com/careers → https://app170.workline.hr/Candidate/
// The careers page hands off to a Workline candidate portal whose openings list is filled by one JSON POST (no
// parameters needed) that returns every live requisition with resort, city, function, grade, dates and a slug.
// Each job's page is /CandidatePortal/<track token>/<slug>; roles are resort staff all over India.
import { fetchJson, findDate, main, toDate } from "./lib.mjs";

const BASE = "https://app170.workline.hr";
const API = `${BASE}/CPortal/generalopening.aspx/GetCurrentopening`;

const shortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : null;

await main({
  source: "sterling",
  table: "jobs_sterling",
  company: "Sterling Holiday Resorts",
  async scrape() {
    const { d } = await fetchJson(API, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ JDFileName: "", OrgCode: "", KeyName: "" }),
    });
    const jobs = JSON.parse(d?.obj1 ?? "[]"); // the list itself is a JSON string inside the JSON reply
    return jobs.map((job) => {
      const resort = job.LOCATIONNAME || null;
      const closes = toDate(job.Req_Before) >= toDate(Date.now()) ? shortDate(job.Req_Before) : null;
      // Titles are bare grades ("Associate", "Assistant Manager"), so the function is added: "Associate – F&B Service"
      const name = [job.Position_Name, job.ExternalJobName].filter(Boolean).join(" - ");
      const title = job.FunctionName && !name.toLowerCase().includes(job.FunctionName.toLowerCase()) ? `${name} – ${job.FunctionName}` : name;
      return {
        title,
        url: `${BASE}/CandidatePortal/${job.TrackToken}/${encodeURIComponent(job.SearchKeyWord)}`,
        location: [...new Set([resort, job.City_Name, job.State_Name].filter(Boolean))].join(", ") || job.Country_Name,
        description: [
          job.FunctionName,
          job.FunName && job.FunName !== job.FunctionName ? job.FunName : null,
          job.Category_Name,
          job.Experience && job.Experience !== "0 years" ? `${job.Experience} experience` : null,
          resort && `at ${resort}`,
          closes && `Apply by ${closes}`,
        ]
          .filter(Boolean)
          .join(" · "),
        posted_at: findDate(job.PublishDate ?? "")?.date ?? job.Approved_Date, // "02-Nov-2026"
      };
    });
  },
});
