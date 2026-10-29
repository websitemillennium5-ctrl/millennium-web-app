/**
 * Recruiter email addresses (table `recruiter_emails`, supabase/migrations/0016_recruiter_emails.sql) and the
 * pre-filled "Email recruiter" draft the student portal builds from them. Mirrored in the mobile app's
 * src/lib/recruiters.ts (keep in sync).
 */
import { brandKey } from "@/lib/airlines";
import { courseTitle } from "@/lib/format";
import { site } from "@/lib/site";

export type RecruiterEmail = {
  id: string;
  source: string;
  email: string;
  label: string;
  found_on: string | null;
  note: string | null;
  is_active: boolean;
};

/** Active addresses grouped by employer key. */
export type RecruiterBook = Record<string, RecruiterEmail[]>;

export function groupRecruiters(rows: RecruiterEmail[]): RecruiterBook {
  const book: RecruiterBook = {};
  for (const row of rows) (book[row.source] ??= []).push(row);
  return book;
}

/** The addresses for a job or event: by its source key, else by the brand its company name matches. */
export function recruitersFor(book: RecruiterBook | undefined, source: string, company: string) {
  if (!book) return [];
  return book[source] ?? book[brandKey(source, company) ?? ""] ?? [];
}

/** The student details that go into the draft (a subset of the profile). */
export type Applicant = {
  full_name: string;
  email: string | null;
  phone: string | null;
  student_id: string | null;
  course_slug: string | null;
  batch: string | null;
};

export type Listing = { title: string; company: string; location?: string | null; url: string; kind?: "job" | "event" };

/**
 * `mailto:` draft to every address, with the subject and body pre-typed: the role, its link and the student's
 * saved details. Email clients accept several comma-separated recipients (RFC 6068).
 */
export function recruiterMailto(emails: RecruiterEmail[], listing: Listing, applicant: Applicant) {
  if (emails.length === 0) return null;
  const to = emails.map((e) => e.email).join(",");
  const name = applicant.full_name.trim() || "Millennium student";
  const isEvent = listing.kind === "event";
  const subject = `Application for ${listing.title} – ${name}`;
  const details = [
    ["Name", name],
    ["Student ID", applicant.student_id],
    ["Course", applicant.course_slug ? courseTitle(applicant.course_slug) : null],
    ["Batch", applicant.batch],
    ["Phone", applicant.phone],
    ["Email", applicant.email],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\r\n");
  const body = [
    `Dear Hiring Team at ${listing.company},`,
    "",
    isEvent
      ? `I would like to register for the ${listing.title}${listing.location ? ` in ${listing.location}` : ""}:`
      : `I would like to apply for the ${listing.title} position${listing.location ? ` (${listing.location})` : ""} listed on your careers site:`,
    listing.url,
    "",
    `I am a student at ${site.name}, Patna, and would be glad to be considered. My details:`,
    "",
    details,
    "",
    `My CV is attached. I look forward to hearing from you.`,
    "",
    "Kind regards,",
    name,
    applicant.phone ?? "",
  ].join("\r\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
