import { roles, type RoleKey } from "@/lib/airlines";

/** Jobs page filters, read from and written to the URL so filtered views can be bookmarked and shared. */
export type JobQuery = {
  q: string;
  source: string[]; // airline keys; empty = all airlines
  role: RoleKey | "";
  posted: "" | "7" | "30";
  sort: "newest" | "oldest";
  status: "" | "active" | "hidden";
  page: number;
};

export const JOBS_PAGE_SIZE = 20;
/** How many hiring events the jobs page shows above the openings before linking to the full events list. */
export const EVENTS_PREVIEW = 6;

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

export function parseJobQuery(sp: Record<string, string | string[] | undefined>): JobQuery {
  const role = one(sp.role);
  const posted = one(sp.posted);
  const status = one(sp.status);
  const page = Number.parseInt(one(sp.page), 10);
  return {
    q: one(sp.q),
    source: one(sp.source).split(",").filter(Boolean),
    role: role in roles ? (role as RoleKey) : "",
    posted: posted === "7" || posted === "30" ? posted : "",
    sort: one(sp.sort) === "oldest" ? "oldest" : "newest",
    status: status === "active" || status === "hidden" ? status : "",
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** URL for the current filters with `changes` applied. Any filter change jumps back to page 1. */
export function jobQueryHref(basePath: string, query: JobQuery, changes: Partial<JobQuery> = {}) {
  const next = { ...query, page: 1, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.source.length) params.set("source", next.source.join(","));
  if (next.role) params.set("role", next.role);
  if (next.posted) params.set("posted", next.posted);
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.status) params.set("status", next.status);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
