/**
 * Recruiter email addresses (table `recruiter_emails`, supabase/migrations/0016_recruiter_emails.sql) and the
 * pre-filled "Email recruiter" draft the student portal builds from them. Mirrored in the mobile app's
 * src/lib/recruiters.ts (keep in sync).
 */
import { brandKey } from "@/lib/airlines";

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
 * `mailto:` draft to every address, with the subject and a full cover note pre-typed: the role, its link and the
 * student's name. Deliberately no institute, ID, course or batch details; the student can add anything they
 * like before sending. Email clients accept several comma-separated recipients (RFC 6068).
 */
export function recruiterMailto(emails: RecruiterEmail[], listing: Listing, applicant: Applicant) {
  if (emails.length === 0) return null;
  const to = emails.map((e) => e.email).join(",");
  const name = applicant.full_name.trim() || "Applicant";
  const isEvent = listing.kind === "event";
  const where = listing.location ? ` in ${listing.location}` : "";
  const subject = isEvent ? `Registration for ${listing.title} – ${name}` : `Application for ${listing.title} – ${name}`;
  const body = [
    `Dear Hiring Team at ${listing.company},`,
    "",
    isEvent
      ? `I hope this message finds you well. I am writing to register my interest in the ${listing.title}${where} and to request a place at the event. I came across the details here:`
      : `I hope this message finds you well. I am writing to express my keen interest in the ${listing.title} position${where} that I came across on your careers page:`,
    listing.url,
    "",
    `${listing.company} has long stood out to me for the warmth and professionalism of its people, and the standard of service it is known for is exactly the kind of environment in which I want to build my career. I have been preparing for a role like this with real commitment and would be grateful for the opportunity to be considered.`,
    "",
    "What I would bring to the role:",
    "• Genuine passion for hospitality and customer care, and the patience to stay calm and courteous under pressure.",
    "• Clear, confident communication in English and Hindi, with a friendly and well-groomed presence.",
    "• Strong awareness of safety, discipline and punctuality, and the attention to detail that passengers and guests notice.",
    "• A team-first attitude: I enjoy working with people from different backgrounds and I learn quickly.",
    "• Flexibility to work shifts, weekends and holidays, and willingness to relocate as the role requires.",
    "",
    isEvent
      ? "Please let me know if there is anything I should bring or complete beforehand. I will be present with my documents and would appreciate confirmation of my registration."
      : "I would welcome the chance to discuss how I can contribute to your team, and I am available for an interview or assessment at your convenience. Please let me know if you need any further information or documents from me.",
    "",
    "My CV is attached for your reference. Thank you very much for your time and consideration. I look forward to hearing from you.",
    "",
    "Warm regards,",
    name,
  ].join("\r\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
