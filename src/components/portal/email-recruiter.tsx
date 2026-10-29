import { Mail } from "lucide-react";
import { recruiterMailto, type Applicant, type Listing, type RecruiterEmail } from "@/lib/recruiters";

const button = {
  sm: "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25",
  lg: "inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-base font-semibold text-ink transition hover:border-ink/25",
};

/**
 * "Email recruiter": opens the student's mail app with a draft to every published address for the employer, the
 * role and the student's saved details pre-typed. Renders nothing when the employer has no address on file.
 */
export function EmailRecruiterButton({
  emails,
  listing,
  applicant,
  size = "sm",
}: {
  emails: RecruiterEmail[];
  listing: Listing;
  applicant: Applicant;
  size?: "sm" | "lg";
}) {
  const href = recruiterMailto(emails, listing, applicant);
  if (!href) return null;
  return (
    <a href={href} title={`Opens a draft to ${emails.map((e) => e.email).join(", ")}`} className={button[size]}>
      <Mail className={size === "lg" ? "size-4" : "size-3.5"} strokeWidth={1.75} />
      {emails.length > 1 ? `Email ${emails.length} recruiters` : "Email recruiter"}
    </a>
  );
}

/** Detail-page row: the addresses the draft goes to, so the student knows who they're writing to. */
export function RecruiterAddresses({ emails, listing, applicant }: { emails: RecruiterEmail[]; listing: Listing; applicant: Applicant }) {
  const href = recruiterMailto(emails, listing, applicant);
  if (!href) return null;
  return (
    <div className="space-y-2.5 text-sm text-ink-soft">
      <p className="leading-relaxed">
        {listing.company} publishes {emails.length === 1 ? "this address" : "these addresses"} for applicants. Tap{" "}
        <a href={href} className="font-medium text-ink underline underline-offset-2">
          Email recruiter
        </a>{" "}
        to open a draft with the role and your details filled in, then attach your CV and send.
      </p>
      <ul className="space-y-1.5">
        {emails.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
            <Mail className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />
            <span className="font-medium text-ink">{e.email}</span>
            {e.label && <span className="text-muted">· {e.label}</span>}
            {e.note && <span className="basis-full pl-5.5 text-muted">{e.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
