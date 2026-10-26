"use client";

import { useOptimistic, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { updateLeadStatus } from "@/app/admin/actions";
import { leadStatuses, type LeadStatus } from "@/lib/leads";

/** Status pill (coloured dot + label) that saves as soon as a new stage is picked. */
export function LeadStatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(status);
  const stage = leadStatuses.find((s) => s.value === current) ?? leadStatuses[0];

  return (
    <label className="relative inline-flex h-8 w-full items-center gap-2 rounded-full border border-line bg-white pr-7 pl-3 text-[12.5px] font-medium text-ink transition hover:border-ink/25 focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5">
      {pending ? <Loader2 className="size-3 shrink-0 animate-spin text-muted" /> : <span className={`size-2 shrink-0 rounded-full ${stage.dot}`} />}
      <span className="truncate">{stage.label}</span>
      <select
        aria-label="Lead status"
        value={current}
        onChange={(e) => {
          const next = e.target.value as LeadStatus;
          startTransition(async () => {
            setCurrent(next);
            await updateLeadStatus(id, next);
          });
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {leadStatuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-muted" />
    </label>
  );
}
