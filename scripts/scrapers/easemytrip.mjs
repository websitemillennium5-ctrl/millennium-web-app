// EaseMyTrip: https://www.easemytrip.com/career.html#roles
// One static page whose "Open positions" grid is rendered client-side from a `const ROLES = [...]` array in an inline
// script (title, department, city, type, experience, about-the-role prose). Every role applies through the same
// Google Form, so each job's URL is the careers page plus a #role-<slug> fragment. The list is hand-maintained.
import { fetchText, main } from "./lib.mjs";

const PAGE = "https://www.easemytrip.com/career.html";

/** The value of a single-quoted `key:'…'` field inside one role literal, with JS escapes undone. */
const field = (literal, key) =>
  literal.match(new RegExp(`\\b${key}:'((?:[^'\\\\]|\\\\.)*)'`))?.[1].replace(/\\(.)/g, "$1").trim() || null;

const slug = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

await main({
  source: "easemytrip",
  table: "jobs_easemytrip",
  company: "EaseMyTrip",
  allowEmpty: true,
  async scrape() {
    const html = await fetchText(PAGE);
    const start = html.indexOf("const ROLES = [");
    const end = start < 0 ? -1 : html.indexOf("\n];", start);
    if (end < 0) throw new Error("no ROLES array on the page (site changed?)");

    const seen = new Map();
    return html
      .slice(start, end)
      .split(/\{\s*title:/)
      .slice(1)
      .map((literal) => {
        const title = field(`title:${literal}`, "title");
        if (!title) return null;
        const base = slug(title);
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        const dept = field(literal, "dept");
        const type = field(literal, "type");
        const exp = field(literal, "exp");
        const summary = [dept, type, exp && `${exp} experience`].filter(Boolean).join(" · ");
        return {
          title,
          url: `${PAGE}#role-${base}${n > 1 ? `-${n}` : ""}`,
          location: field(literal, "loc"),
          description: [summary, field(literal, "about")].filter(Boolean).join(" — "),
        };
      })
      .filter(Boolean);
  },
});
