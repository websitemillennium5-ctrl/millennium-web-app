import { roles } from "@/lib/airlines";
import type { Profile } from "@/lib/auth";
import type { LeadStatus } from "@/lib/leads";
import { JOBS_PAGE_SIZE, type JobQuery } from "@/lib/job-query";
import { hotelSources } from "@/lib/job-sources";
import { STUDENTS_PAGE_SIZE, type StudentQuery } from "@/lib/student-query";
import { createClient } from "@/lib/supabase/server";

export type FeePayment = { id: string; student_id: string; amount: number; paid_on: string; method: string; note: string | null; created_at: string };
export type Announcement = { id: string; title: string; body: string; course_slug: string | null; pinned: boolean; created_at: string };
export type StudyMaterial = {
  id: string;
  title: string;
  description: string;
  /** null = every student */
  batch: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  link_url: string | null;
  created_at: string;
};
export type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  description: string | null;
  posted_at: string | null;
  is_active: boolean;
  scraped_at: string;
};

export type HiringEvent = {
  id: string;
  source: string;
  brand: string;
  title: string;
  url: string;
  event_type: "walk_in" | "open_day" | "interview" | "online_drive" | "other";
  role: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  event_date: string | null;
  event_time: string | null;
  apply_url: string | null;
  description: string | null;
  is_active: boolean;
  scraped_at: string;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  experience: string | null;
  experience_details: string | null;
  course: string | null;
  message: string | null;
  source: string;
  listing_title: string | null;
  listing_url: string | null;
  student_id_tried: string | null;
  status: LeadStatus;
  created_at: string;
};

/** Website leads (enquiries and jobs-page applicants), newest first. RLS limits this to staff. Filtering is done
 *  by the page, since the list is small and the status tabs need counts across all of it. */
export async function getLeads() {
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(1000);
  return ((data ?? []) as Lead[]).map((l) => ({ ...l, status: l.status ?? "new" }));
}

/** Fee payments for one student plus the paid/due totals. RLS limits students to their own rows. */
export async function getFees(studentId: string, feeTotal: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("fee_payments").select("*").eq("student_id", studentId).order("paid_on", { ascending: false });
  const payments = (data ?? []) as FeePayment[];
  const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return { payments, paid, due: Math.max(Number(feeTotal) - paid, 0) };
}

/** Announcements visible to the caller (RLS filters by course for students). */
export async function getAnnouncements(limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Announcement[];
}

/** Study material the signed-in user can see (RLS limits students to their batch plus everyone's), newest first. */
export async function getStudyMaterials(limit = 200) {
  const supabase = await createClient();
  const { data } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as StudyMaterial[];
}

/** Jobs from every source table merged through the `all_jobs` view, newest first. */
export async function getJobs({ includeInactive = false, limit = 200, source = "", search = "" } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("all_jobs")
    .select("*")
    .order("posted_at", { ascending: false, nullsFirst: false })
    .order("scraped_at", { ascending: false })
    .limit(limit);
  if (!includeInactive) query = query.eq("is_active", true);
  if (source) query = query.eq("source", source);
  if (search) {
    const s = search.replace(/[%,()]/g, " ");
    query = query.or(`title.ilike.%${s}%,location.ilike.%${s}%,company.ilike.%${s}%`);
  }
  const { data } = await query;
  return (data ?? []) as Job[];
}

export type StudentRow = Profile & { paid: number; due: number; last_paid_on: string | null };

/** One page of students (with fee roll-ups) matching the staff filter panel, plus totals for pagination. */
export async function searchStudents(query: StudentQuery) {
  const supabase = await createClient();
  const from = (query.page - 1) * STUDENTS_PAGE_SIZE;
  let request = supabase.from("student_overview").select("*", { count: "exact" });

  if (query.course) request = request.eq("course_slug", query.course);
  if (query.batch) request = request.eq("batch", query.batch);
  if (query.fees === "due") request = request.gt("due", 0);
  if (query.fees === "paid") request = request.eq("due", 0);
  if (query.joined) {
    const since = new Date(Date.now() - Number(query.joined) * 86_400_000).toISOString().slice(0, 10);
    request = request.gte("joined_on", since);
  }
  if (query.q) {
    const s = query.q.replace(/[%,()]/g, " ");
    request = request.or(`full_name.ilike.%${s}%,roll_no.ilike.%${s}%,student_id.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
  }
  request =
    query.sort === "name"
      ? request.order("full_name")
      : query.sort === "due"
        ? request.order("due", { ascending: false }).order("full_name")
        : request.order("created_at", { ascending: query.sort === "oldest" });

  const { data, count } = await request.range(from, from + STUDENTS_PAGE_SIZE - 1);
  const total = count ?? 0;
  return {
    students: (data ?? []).map((r) => ({ ...r, paid: Number(r.paid), due: Number(r.due), fee_total: Number(r.fee_total) })) as StudentRow[],
    total,
    pageCount: Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE)),
  };
}

/** Unfiltered roll-up for the student list's summary strip and course tabs. */
export async function getStudentSummary() {
  const supabase = await createClient();
  const { data } = await supabase.from("student_overview").select("course_slug, due, joined_on");
  const rows = (data ?? []).map((r) => ({ ...r, due: Number(r.due) }));
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const owing = rows.filter((r) => r.due > 0);
  const byCourse: Record<string, number> = {};
  for (const r of rows) if (r.course_slug) byCourse[r.course_slug] = (byCourse[r.course_slug] ?? 0) + 1;
  return {
    total: rows.length,
    owing: owing.length,
    dueAmount: owing.reduce((s, r) => s + r.due, 0),
    paid: rows.length - owing.length,
    recent: rows.filter((r) => r.joined_on >= since).length,
    byCourse,
  };
}

/** Distinct batch names, for the batch filter. */
export async function getBatches() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("batch").eq("role", "student").not("batch", "is", null);
  return [...new Set((data ?? []).map((r) => r.batch as string))].sort();
}

/** One page of jobs matching the filter panel, plus the total match count for pagination. */
export async function searchJobs(query: JobQuery, { includeInactive = false } = {}) {
  const supabase = await createClient();
  const from = (query.page - 1) * JOBS_PAGE_SIZE;
  let request = supabase
    .from("all_jobs")
    .select("*", { count: "exact" })
    .order("posted_at", { ascending: query.sort === "oldest", nullsFirst: false })
    .order("scraped_at", { ascending: query.sort === "oldest" })
    .range(from, from + JOBS_PAGE_SIZE - 1);

  if (!includeInactive || query.status === "active") request = request.eq("is_active", true);
  else if (query.status === "hidden") request = request.eq("is_active", false);
  if (query.source.length) request = request.in("source", query.source);
  if (query.role === "hospitality") {
    // Hotel-group jobs are all hospitality roles, whatever the title says
    request = request.or([...roles.hospitality.terms.map((t) => `title.ilike.%${t}%`), `source.in.(${hotelSources.join(",")})`].join(","));
  } else if (query.role) {
    request = request.or(roles[query.role].terms.map((t) => `title.ilike.%${t}%`).join(",")).not("source", "in", `(${hotelSources.join(",")})`);
  }
  if (query.posted) {
    const since = new Date(Date.now() - Number(query.posted) * 86_400_000).toISOString().slice(0, 10);
    request = request.gte("posted_at", since);
  }
  if (query.q) {
    const s = query.q.replace(/[%,()]/g, " ");
    request = request.or(`title.ilike.%${s}%,location.ilike.%${s}%,company.ilike.%${s}%`);
  }

  const { data, count } = await request;
  const total = count ?? 0;
  return { jobs: (data ?? []) as Job[], total, pageCount: Math.max(1, Math.ceil(total / JOBS_PAGE_SIZE)) };
}

/** Upcoming hiring events from every source table (the `all_hiring_events` view hides past ones), soonest first; undated drives last. */
export async function getEvents({ includeInactive = false, limit = 300, brand = "", search = "" } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("all_hiring_events")
    .select("*")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("city", { ascending: true })
    .limit(limit);
  if (!includeInactive) query = query.eq("is_active", true);
  if (brand) query = query.eq("brand", brand);
  if (search) {
    const s = search.replace(/[%,()]/g, " ");
    query = query.or(`title.ilike.%${s}%,city.ilike.%${s}%,role.ilike.%${s}%,venue.ilike.%${s}%`);
  }
  const { data } = await query;
  return (data ?? []) as HiringEvent[];
}

/** One job for the job detail page. RLS hides inactive jobs from students. */
export async function getJobDetail(source: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("all_jobs").select("*").eq("source", source).eq("id", id).maybeSingle();
  return data ? { job: data as Job } : null;
}

/** One upcoming hiring event for the event detail page. */
export async function getEventDetail(source: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("all_hiring_events").select("*").eq("source", source).eq("id", id).maybeSingle();
  return data ? { event: data as HiringEvent } : null;
}
