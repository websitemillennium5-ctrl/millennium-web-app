// Headout (Bengaluru): https://www.headout.com/careers/#work-with-us
// The "Open roles" section is filled client-side from Headout's public Greenhouse boards ("headoutcareers" plus a
// usually empty "headoutreferrals"). Reads each board's jobs JSON with content, keeps the roles located in India and
// summarises them by department, employment type and workplace type. Job URLs are the Greenhouse pages the site opens.
import { decodeEntities, fetchJson, main } from "./lib.mjs";

const BOARDS = ["headoutcareers", "headoutreferrals"];
const API = (board) => `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
const INDIA = /\bindia\b|bengaluru|bangalore|mumbai|delhi|gurugram|gurgaon|noida|hyderabad|chennai|pune|kolkata/i;

const meta = (job, name) => job.metadata?.find((m) => m.name === name)?.value || null;

await main({
  source: "headout",
  table: "jobs_headout",
  company: "Headout",
  allowEmpty: true, // a dozen Bengaluru roles today; the boards can legitimately list none in India
  async scrape() {
    const boards = await Promise.all(
      BOARDS.map((board, i) =>
        fetchJson(API(board))
          .then(({ jobs = [] }) => jobs)
          .catch((error) => {
            if (i === 0) throw error; // the main board must load; the referrals board is a bonus
            console.error(`[headout] ${board} board unavailable: ${error.message}`);
            return [];
          }),
      ),
    );

    return boards
      .flat()
      .filter((job) => INDIA.test(job.location?.name ?? "") || job.offices?.some((o) => INDIA.test(o.name ?? "")))
      .map((job) => {
        const office = job.offices?.find((o) => INDIA.test(o.name ?? ""))?.name || job.location?.name;
        const facts = [job.departments?.[0]?.name, meta(job, "Employment Type"), meta(job, "Workplace Type"), office && `at ${office}`]
          .filter(Boolean)
          .join(" · ");
        // The description is entity-encoded HTML that opens with the same "Why Headout?" intro on every role and
        // closes with the same "content-conclusion" block
        const content = job.content
          ? decodeEntities(job.content)
              .replace(/^\s*<div class="content-intro">[\s\S]*?<\/div>\s*/, "")
              .replace(/<div class="content-conclusion">[\s\S]*$/, "")
          : "";
        return {
          title: job.title,
          url: job.absolute_url,
          location: office || null,
          description: content ? `${facts} — ${content}` : facts,
          posted_at: job.first_published ?? job.updated_at,
        };
      });
  },
});
