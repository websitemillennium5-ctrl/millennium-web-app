import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { StudentRow } from "@/lib/data";
import { courseStyle } from "@/lib/course-style";
import { courseTitle, formatDate, formatINR } from "@/lib/format";
import { CourseIcon } from "@/components/portal/course-icon";
import { initials } from "@/components/portal/student-card";
import { Meter } from "@/components/portal/ui";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "Today", "3 days ago", "2 months ago". */
export function ago(value: string) {
  const days = Math.round((new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  const text = Math.abs(days) < 45 ? relative.format(days, "day") : relative.format(Math.round(days / 30), "month");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Fixed grid: every row lines up regardless of content. Percentages sum to 100.
const columns = [
  { label: "#", width: "4%", align: "text-center" },
  { label: "Student", width: "22%" },
  { label: "Student ID", width: "11%" },
  { label: "Roll no.", width: "9%" },
  { label: "Course", width: "17%" },
  { label: "Batch", width: "8%" },
  { label: "Fees", width: "15%" },
  { label: "Last paid", width: "10%" },
  { label: "", width: "4%" },
];

// Grid lines: every cell draws its bottom and right edge; the last column skips the right edge.
const cell = "border-b border-r border-line px-3 py-2.5 align-middle last:border-r-0";

/** Compact grid view of the student list: same course colours and fee bar as the cards, plus a page total. */
export function StudentTable({ students, offset = 0 }: { students: StudentRow[]; offset?: number }) {
  const totals = students.reduce((t, s) => ({ fee: t.fee + s.fee_total, paid: t.paid + s.paid, due: t.due + s.due }), { fee: 0, paid: 0, due: 0 });

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[64rem] table-fixed border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          {columns.map((c, i) => (
            <col key={i} style={{ width: c.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                scope="col"
                className={`${cell} bg-mist py-3 text-[10.5px] font-semibold tracking-[0.12em] whitespace-nowrap text-muted uppercase ${c.align ?? ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {students.map((s, i) => {
            const style = courseStyle(s.course_slug);
            const share = s.fee_total > 0 ? s.paid / s.fee_total : s.due === 0 ? 1 : 0;
            const href = `/admin/students/${s.id}`;
            const clear = s.due === 0;
            return (
              <tr key={s.id} className="group transition-colors odd:bg-white even:bg-mist/30 hover:bg-sky-50/40">
                <td className={`${cell} text-center text-xs text-muted tabular-nums`}>{offset + i + 1}</td>

                <td className={cell}>
                  <Link href={href} className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${style.color}, color-mix(in srgb, ${style.color} 70%, black))` }}
                      aria-hidden
                    >
                      {initials(s.full_name || s.email || "")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink group-hover:underline">{s.full_name || s.email}</span>
                      <span className="block truncate text-xs text-muted">{s.phone ?? s.email}</span>
                    </span>
                  </Link>
                </td>

                <td className={`${cell} truncate text-ink-soft tabular-nums`}>{s.student_id ?? <span className="text-muted/60">—</span>}</td>
                <td className={`${cell} truncate text-ink-soft tabular-nums`}>{s.roll_no ?? <span className="text-muted/60">—</span>}</td>

                <td className={cell}>
                  <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${style.chip}`}>
                    <CourseIcon course={s.course_slug} className="size-3.5 shrink-0" />
                    <span className="truncate">{courseTitle(s.course_slug)}</span>
                  </span>
                </td>

                <td className={`${cell} truncate text-ink-soft`}>{s.batch ?? <span className="text-muted/60">—</span>}</td>

                <td className={cell}>
                  <div className="flex items-center justify-between gap-2">
                    <Meter value={share} tone={clear ? "good" : "ink"} />
                    <span className={`text-xs font-semibold tabular-nums ${clear ? "text-good" : "text-ink"}`}>{Math.round(share * 100)}%</span>
                  </div>
                  <p className={`mt-0.5 truncate text-xs tabular-nums ${clear ? "text-good" : "text-red-600"}`}>
                    {clear ? "Fully paid" : `${formatINR(s.due)} due`}
                  </p>
                </td>

                <td className={cell}>
                  {s.last_paid_on ? (
                    <>
                      <span className="block truncate text-ink-soft">{ago(s.last_paid_on)}</span>
                      <span className="block truncate text-xs text-muted tabular-nums">{formatDate(s.last_paid_on)}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted">No payments</span>
                  )}
                </td>

                <td className={`${cell} px-1.5 text-center`}>
                  <Link
                    href={href}
                    aria-label={`Open ${s.full_name}`}
                    className="inline-flex size-7 items-center justify-center rounded-full border border-transparent text-muted transition group-hover:border-line group-hover:bg-white group-hover:text-ink"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="bg-mist/60 text-xs">
            <td className="border-r border-line px-3 py-3" />
            <td colSpan={5} className="border-r border-line px-3 py-3 text-muted">
              Totals for the {students.length} {students.length === 1 ? "student" : "students"} on this page
            </td>
            <td className="border-r border-line px-3 py-3 tabular-nums">
              <span className="block font-semibold text-ink">{formatINR(totals.paid)} paid</span>
              <span className={`block ${totals.due ? "text-red-600" : "text-good"}`}>{formatINR(totals.due)} due</span>
            </td>
            <td colSpan={2} className="px-3 py-3 text-muted tabular-nums">
              of {formatINR(totals.fee)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
