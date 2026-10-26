import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteEvent, deleteJob, toggleEvent, toggleJob } from "@/app/admin/actions";
import type { HiringEvent, Job } from "@/lib/data";
import { emailAddress, formatDate, isEmailLink } from "@/lib/format";
import { CopyButton } from "@/components/portal/copy-button";
import { dateFormat, eventDay, typeLabel } from "@/components/portal/event-list";
import { ConfirmButton, IconSubmit } from "@/components/portal/form";

const applyLine = (url: string, verb: string) => (isEmailLink(url) ? `📧 Apply by email: ${emailAddress(url)}` : `🔗 ${verb}: ${url}`);

/** Plain-text summary for pasting into WhatsApp / email, one detail per line. */
function shareText(kind: "job" | "event", item: Job | HiringEvent) {
  if (kind === "job") {
    const job = item as Job;
    return [
      `✈️ ${job.company}: ${job.title}`,
      job.location && `📍 ${job.location}`,
      job.posted_at && `🗓️ Posted ${formatDate(job.posted_at)}`,
      applyLine(job.url, "Apply"),
    ]
      .filter(Boolean)
      .join("\n");
  }
  const e = item as HiringEvent;
  const place = [e.city, e.country].filter(Boolean).join(", ");
  return [
    `✈️ ${e.brand} ${typeLabel[e.event_type].toLowerCase()}: ${e.title}`,
    e.event_date && `📅 ${dateFormat.format(eventDay(e.event_date))}${e.event_time ? ` · ${e.event_time}` : ""}`,
    (e.venue || place) && `📍 ${e.venue ?? place}`,
    e.role && `👤 Role: ${e.role}`,
    e.description && `ℹ️ ${e.description}`,
    e.apply_url ? applyLine(e.apply_url, "Register") : `🔗 Details: ${e.url}`,
    e.apply_url && e.apply_url !== e.url && `Event page: ${e.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Staff copy + hide/show + delete buttons for a job or hiring event, used on the Jobs list and the detail pages. */
export function ListingActions({
  kind,
  item,
  from,
}: {
  kind: "job" | "event";
  item: Job | HiringEvent;
  from?: "detail";
}) {
  const fields = (
    <>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="source" value={item.source} />
    </>
  );
  return (
    <>
      <CopyButton text={shareText(kind, item)} label={kind === "job" ? "Copy job details" : "Copy event details"} />
      <form action={kind === "job" ? toggleJob : toggleEvent}>
        {fields}
        <input type="hidden" name="active" value={String(item.is_active)} />
        <IconSubmit label={item.is_active ? "Hide from students" : "Show to students"}>
          {item.is_active ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
        </IconSubmit>
      </form>
      <form action={kind === "job" ? deleteJob : deleteEvent}>
        {fields}
        {from && <input type="hidden" name="from" value={from} />}
        <ConfirmButton
          message={
            kind === "job"
              ? "Delete this job listing? It will come back on the next scrape if the airline still lists it."
              : "Delete this event? It will come back on the next scrape if the airline still lists it."
          }
          icon={<Trash2 className="size-4" strokeWidth={1.75} />}
        >
          Delete
        </ConfirmButton>
      </form>
    </>
  );
}
