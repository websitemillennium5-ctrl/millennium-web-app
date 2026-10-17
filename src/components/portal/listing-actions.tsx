import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteEvent, deleteJob, toggleEvent, toggleJob } from "@/app/admin/actions";
import { ConfirmButton, IconSubmit } from "@/components/portal/form";

/** Staff hide/show + delete buttons for a job or hiring event, used on the Jobs list and the detail pages. */
export function ListingActions({
  kind,
  item,
  from,
}: {
  kind: "job" | "event";
  item: { id: string; source: string; is_active: boolean };
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
