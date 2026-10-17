import { courses } from "@/lib/site";

/** Staff student-list filters, kept in the URL like the jobs filters. */
export type StudentQuery = {
  q: string;
  course: string;
  batch: string;
  fees: "" | "due" | "paid";
  joined: "" | "30" | "180" | "365";
  sort: "newest" | "oldest" | "name" | "due";
  view: "cards" | "table";
  page: number;
};

export const STUDENTS_PAGE_SIZE = 20;

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const pick = <T extends string>(value: string, allowed: readonly T[], fallback: T) => ((allowed as readonly string[]).includes(value) ? (value as T) : fallback);

export function parseStudentQuery(sp: Record<string, string | string[] | undefined>): StudentQuery {
  const course = one(sp.course);
  const page = Number.parseInt(one(sp.page), 10);
  return {
    q: one(sp.q),
    course: courses.some((c) => c.slug === course) ? course : "",
    batch: one(sp.batch),
    fees: pick(one(sp.fees), ["", "due", "paid"] as const, ""),
    joined: pick(one(sp.joined), ["", "30", "180", "365"] as const, ""),
    sort: pick(one(sp.sort), ["newest", "oldest", "name", "due"] as const, "newest"),
    view: pick(one(sp.view), ["cards", "table"] as const, "cards"),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** URL for the current filters with `changes` applied. Any filter change jumps back to page 1. */
export function studentQueryHref(query: StudentQuery, changes: Partial<StudentQuery> = {}) {
  const next = { ...query, page: 1, ...changes };
  const params = new URLSearchParams();
  for (const key of ["q", "course", "batch", "fees", "joined"] as const) if (next[key]) params.set(key, next[key]);
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.view !== "cards") params.set("view", next.view);
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/admin/students?${qs}` : "/admin/students";
}
