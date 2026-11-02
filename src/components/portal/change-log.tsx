import Link from "next/link";
import { ArrowRight, KeyRound, Pencil, Trash2, UserPlus, UserX, Wallet } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { actionLabels, fieldLabels, showValue, type ChangeAction, type StudentChange } from "@/lib/student-changes";
import { initials } from "@/components/portal/student-card";

const icons: Record<ChangeAction, { icon: typeof Pencil; tone: string }> = {
  created: { icon: UserPlus, tone: "bg-good/10 text-good" },
  updated: { icon: Pencil, tone: "bg-sky-50 text-sky-700" },
  payment_added: { icon: Wallet, tone: "bg-good/10 text-good" },
  payment_deleted: { icon: Trash2, tone: "bg-red-50 text-red-700" },
  password_reset: { icon: KeyRound, tone: "bg-amber-50 text-amber-800" },
  deleted: { icon: UserX, tone: "bg-red-50 text-red-700" },
};

/**
 * The audit trail as a vertical timeline: who did what, when, and for edits the exact before → after per field.
 * `showStudent` names and links the student on each entry (the Activity page); the student page leaves it off.
 */
export function ChangeLog({ entries, showStudent = false }: { entries: StudentChange[]; showStudent?: boolean }) {
  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
      {entries.map((e) => {
        const { icon: Icon, tone } = icons[e.action];
        // A deleted student's row has no id to link to, so the name stays plain text
        const who = showStudent ? (e.student_id ? <Link href={`/admin/students/${e.student_id}`} className="font-semibold text-ink hover:underline">{e.student_name}</Link> : <span className="font-semibold text-ink">{e.student_name}</span>) : null;
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${tone}`} title={e.action.replace("_", " ")}>
              <Icon className="size-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm leading-snug text-ink-soft">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <span className="flex size-4 items-center justify-center rounded-full bg-mist text-[8px] font-bold text-muted">{initials(e.staff_name)}</span>
                  {e.staff_name}
                </span>{" "}
                {actionLabels[e.action]}
                {who && <> for {who}</>}
              </p>
              <time dateTime={e.created_at} className="mt-0.5 block text-[11px] text-muted">
                {formatDateTime(e.created_at)}
              </time>
              {e.changes.length > 0 && (
                <dl className="mt-2 grid gap-1 rounded-xl border border-line bg-mist/40 px-3 py-2 text-xs">
                  {e.changes.map((c) => (
                    <div key={c.field} className="flex flex-wrap items-baseline gap-x-2">
                      <dt className="w-24 shrink-0 text-muted">{fieldLabels[c.field] ?? c.field}</dt>
                      <dd className="flex min-w-0 flex-wrap items-center gap-1.5 text-ink">
                        {e.action === "updated" || e.action === "payment_deleted" ? (
                          <>
                            <span className="truncate text-muted line-through decoration-muted/60">{showValue(c.field, c.from)}</span>
                            <ArrowRight className="size-3 shrink-0 text-muted" />
                          </>
                        ) : null}
                        <span className="truncate font-medium">{showValue(c.field, e.action === "payment_deleted" ? c.from : c.to)}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
