import { ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import type { Lead } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { experienceLabels, leadSources, leadStatuses, needsFollowUp, whatsappHref } from "@/lib/leads";
import { CopyButton } from "@/components/portal/copy-button";
import { LeadStatusSelect } from "@/components/portal/lead-status-select";
import { initials } from "@/components/portal/student-card";
import { ago } from "@/components/portal/student-table";

// Fixed grid, same as the student table. Percentages sum to 100.
const columns = [
  { label: "Lead", width: "20%" },
  { label: "Contact", width: "18%" },
  { label: "Interested in", width: "20%" },
  { label: "Notes", width: "17%" },
  { label: "Received", width: "11%" },
  { label: "Status", width: "14%" },
];

const cell = "border-b border-line px-3 py-3 align-middle first:pl-4 last:pr-4";
const none = <span className="text-muted/60">—</span>;

const sourceChip: Record<string, string> = {
  "jobs page": "border-accent/20 bg-accent/10 text-accent-dark",
  "contact page": "border-sky-200 bg-sky-50 text-sky-800",
  "course page": "border-violet-200 bg-violet-50 text-violet-800",
};

/** Soft avatar colour per person, so names are easy to tell apart down the list. */
const avatarHues = [
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];
const avatarHue = (name: string) => avatarHues[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % avatarHues.length];

function ContactButton({ href, label, children, external }: { href: string; label: string; children: React.ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      {...(external && { target: "_blank", rel: "noreferrer" })}
      className="flex size-7 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition hover:border-ink/25 hover:bg-mist hover:text-ink"
    >
      {children}
    </a>
  );
}

export function LeadTable({ leads, now }: { leads: Lead[]; now: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[68rem] table-fixed border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          {columns.map((c, i) => (
            <col key={i} style={{ width: c.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col" className={`${cell} bg-mist/60 py-2.5 text-[10.5px] font-semibold tracking-[0.12em] whitespace-nowrap text-muted uppercase`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {leads.map((l) => {
            const notes = [l.experience && experienceLabels[l.experience], l.experience_details, l.message].filter(Boolean).join(" · ");
            const stage = leadStatuses.find((s) => s.value === l.status) ?? leadStatuses[0];
            const overdue = needsFollowUp(l, now);
            const whatsapp = whatsappHref(l.phone);
            return (
              <tr key={l.id} className={`group transition-colors hover:bg-mist/50 ${overdue ? "bg-amber-50/40" : ""}`}>
                <td className={cell}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`relative flex size-9 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold ${avatarHue(l.name)}`} aria-hidden>
                      {initials(l.name)}
                      <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white ${stage.dot}`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink" title={l.name}>
                        {l.name}
                      </span>
                      <span className="block truncate text-xs text-muted">{l.city ?? (l.student_id_tried ? `ID ${l.student_id_tried} not found` : "City not given")}</span>
                    </span>
                  </div>
                </td>

                <td className={cell}>
                  <span className="block truncate text-ink-soft tabular-nums">{l.phone}</span>
                  <span className="mt-1.5 flex gap-1.5">
                    <ContactButton href={`tel:${l.phone.replace(/[^\d+]/g, "")}`} label={`Call ${l.name}`}>
                      <Phone className="size-3.5" strokeWidth={1.75} />
                    </ContactButton>
                    {whatsapp && (
                      <ContactButton href={whatsapp} label={`WhatsApp ${l.name}`} external>
                        <MessageCircle className="size-3.5" strokeWidth={1.75} />
                      </ContactButton>
                    )}
                    {l.email && (
                      <ContactButton href={`mailto:${l.email}`} label={`Email ${l.email}`}>
                        <Mail className="size-3.5" strokeWidth={1.75} />
                      </ContactButton>
                    )}
                    <CopyButton text={l.phone} label={`Copy ${l.name}'s number`} small />
                  </span>
                </td>

                <td className={cell}>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${sourceChip[l.source] ?? "border-line bg-mist text-ink-soft"}`}>
                    {leadSources[l.source as keyof typeof leadSources] ?? l.source}
                  </span>
                  {l.source === "jobs page" && l.listing_title ? (
                    l.listing_url ? (
                      <a href={l.listing_url} target="_blank" rel="noreferrer" title={l.listing_title} className="mt-1 flex items-center gap-1 text-ink-soft hover:text-ink">
                        <span className="truncate">{l.listing_title}</span>
                        <ArrowUpRight className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="mt-1 block truncate text-ink-soft">{l.listing_title}</span>
                    )
                  ) : (
                    <span className="mt-1 block truncate text-ink-soft">{l.course ?? "Not sure yet"}</span>
                  )}
                </td>

                <td className={`${cell} text-ink-soft`}>
                  {notes ? (
                    <span title={notes} className="line-clamp-2 text-[12.5px] leading-snug">
                      {notes}
                    </span>
                  ) : (
                    none
                  )}
                </td>

                <td className={cell}>
                  <span className="block truncate text-ink-soft">{ago(l.created_at)}</span>
                  {overdue ? (
                    <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Follow up</span>
                  ) : (
                    <span className="block truncate text-xs text-muted tabular-nums">{formatDate(l.created_at)}</span>
                  )}
                </td>

                <td className={cell}>
                  <LeadStatusSelect key={l.status} id={l.id} status={l.status} />
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
