import Link from "next/link";
import { ArrowUpRight, CalendarDays, Hash, IdCard, IndianRupee, Mail, MessageCircle, Phone, UsersRound } from "lucide-react";
import type { StudentRow } from "@/lib/data";
import { courseStyle } from "@/lib/course-style";
import { courseTitle, formatDate, formatINR } from "@/lib/format";
import { CourseIcon } from "@/components/portal/course-icon";
import { Badge, Meter } from "@/components/portal/ui";

const chip = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs";
const iconButton =
  "flex size-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition hover:border-ink/25 hover:bg-mist hover:text-ink";

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

/** Fee summary column: % paid, segmented bar and a paid/due label. */
function FeeStatus({ student }: { student: StudentRow }) {
  const share = student.fee_total > 0 ? student.paid / student.fee_total : student.due === 0 ? 1 : 0;
  const clear = student.due === 0;
  return (
    <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
      <p className={`text-lg font-semibold tracking-tight ${clear ? "text-good" : "text-ink"}`}>{Math.round(share * 100)}%</p>
      <Meter value={share} tone={clear ? "good" : "ink"} />
      <p className={`text-xs font-medium ${clear ? "text-good" : "text-red-600"}`}>{clear ? "Fully paid" : `${formatINR(student.due)} due`}</p>
    </div>
  );
}

/**
 * Student summary in the same card language as the job cards: course-coloured wash and avatar, ID chips,
 * fee progress on the right, contact actions underneath. `href` adds a "View profile" button (list view).
 */
export function StudentCard({ student, href, as: Tag = "li" }: { student: StudentRow; href?: string; as?: "li" | "section" }) {
  const style = courseStyle(student.course_slug);
  return (
    <Tag className="block rounded-2xl border border-line bg-white p-1.5 transition hover:border-ink/15 hover:shadow-[0_8px_24px_-16px_rgba(24,24,27,0.25)]">
      <div
        className="relative overflow-hidden rounded-xl border border-line/70 p-4"
        style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${style.color} 7%, white) 0%, white 88px)` }}
      >
        <span className="absolute inset-y-4 left-0 w-[3px] rounded-r-full" style={{ background: style.color }} aria-hidden />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold tracking-wide text-white shadow-[0_1px_2px_rgba(24,24,27,0.12)]"
            style={{ background: `linear-gradient(135deg, ${style.color}, color-mix(in srgb, ${style.color} 70%, black))` }}
            aria-hidden
          >
            {initials(student.full_name || student.email || "")}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] leading-snug font-semibold text-ink">
              {href ? (
                <Link href={href} className="hover:underline">
                  {student.full_name || student.email}
                </Link>
              ) : (
                student.full_name || student.email
              )}
            </h3>
            <p className="mt-0.5 truncate text-[12.5px] text-muted">
              {student.email}
              {student.phone && (
                <>
                  <span className="px-1.5">·</span>
                  {student.phone}
                </>
              )}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className={`${chip} font-medium ${style.chip}`}>
                <CourseIcon course={student.course_slug} className="size-3.5" />
                {courseTitle(student.course_slug)}
              </span>
              {student.student_id && (
                <span className={`${chip} border-line bg-white text-ink-soft`}>
                  <IdCard className="size-3.5 text-muted" strokeWidth={1.75} />
                  {student.student_id}
                </span>
              )}
              {student.roll_no && (
                <span className={`${chip} border-line bg-white text-ink-soft`}>
                  <Hash className="size-3.5 text-muted" strokeWidth={1.75} />
                  {student.roll_no}
                </span>
              )}
              {student.batch && (
                <span className={`${chip} border-line bg-white text-ink-soft`}>
                  <UsersRound className="size-3.5 text-muted" strokeWidth={1.75} />
                  {student.batch}
                </span>
              )}
              <span className={`${chip} border-line bg-white text-ink-soft`}>
                <CalendarDays className="size-3.5 text-muted" strokeWidth={1.75} />
                Joined {formatDate(student.joined_on)}
              </span>
            </div>
          </div>

          <div className="sm:border-l sm:border-line sm:pl-5">
            <FeeStatus student={student} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <Badge>{student.last_paid_on ? `Last paid ${formatDate(student.last_paid_on)}` : "No payments yet"}</Badge>
        <div className="flex items-center gap-2">
          {student.phone && (
            <a href={`tel:${student.phone.replace(/\s/g, "")}`} className={iconButton} aria-label={`Call ${student.full_name}`} title="Call">
              <Phone className="size-4" strokeWidth={1.75} />
            </a>
          )}
          {student.email && (
            <a href={`mailto:${student.email}`} className={iconButton} aria-label={`Email ${student.full_name}`} title="Email">
              <Mail className="size-4" strokeWidth={1.75} />
            </a>
          )}
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark"
            >
              View profile <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </Tag>
  );
}

const tileAction =
  "relative z-10 flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-mist hover:text-ink";

/**
 * Compact card for the student list grid. The whole card opens the profile (stretched link on the name);
 * the quick actions sit above it so they stay clickable.
 */
export function StudentTile({ student, href }: { student: StudentRow; href: string }) {
  const style = courseStyle(student.course_slug);
  const name = student.full_name || student.email || "Unnamed student";
  const share = student.fee_total > 0 ? Math.min(student.paid / student.fee_total, 1) : student.due === 0 ? 1 : 0;
  const clear = student.due === 0;
  const phone = student.phone?.replace(/[^\d+]/g, "");
  const ids = [
    ["Student ID", student.student_id],
    ["Roll no", student.roll_no],
    ["Batch", student.batch],
  ] as const;

  return (
    <li className="group relative flex flex-col rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-[0_12px_32px_-18px_rgba(24,24,27,0.35)]">
      <div className="h-1 rounded-t-2xl" style={{ background: style.color }} aria-hidden />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${style.color}, color-mix(in srgb, ${style.color} 70%, black))` }}
            aria-hidden
          >
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-semibold text-ink">
              <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
                {name}
              </Link>
            </h3>
            <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${style.iconClass}`}>
              <CourseIcon course={student.course_slug} className="size-3.5" />
              <span className="truncate">{courseTitle(student.course_slug)}</span>
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${clear ? "bg-good/10 text-good" : "bg-red-50 text-red-600"}`}
          >
            {clear ? "Paid" : "Due"}
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-mist/70 px-3 py-2.5">
          {ids.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10.5px] text-muted">{label}</dt>
              <dd className="truncate text-[12.5px] font-medium text-ink">{value || "—"}</dd>
            </div>
          ))}
        </dl>

        <div>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted">
              <span className="font-semibold text-ink">{formatINR(student.paid)}</span> of {formatINR(student.fee_total)}
            </span>
            <span className={`font-semibold ${clear ? "text-good" : "text-red-600"}`}>{clear ? "Fully paid" : `${formatINR(student.due)} due`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
            <div className={`h-full rounded-full ${clear ? "bg-good" : "bg-ink"}`} style={{ width: `${share * 100}%` }} />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <p className="min-w-0 truncate text-xs text-muted">
            {student.last_paid_on ? `Last paid ${formatDate(student.last_paid_on)}` : `Joined ${formatDate(student.joined_on)}`}
          </p>
          <div className="flex shrink-0 items-center">
            {phone && (
              <>
                <a href={`tel:${phone}`} className={tileAction} aria-label={`Call ${name}`} title="Call">
                  <Phone className="size-4" strokeWidth={1.75} />
                </a>
                <a href={`https://wa.me/${phone.replace(/^\+/, "")}`} target="_blank" rel="noreferrer" className={tileAction} aria-label={`WhatsApp ${name}`} title="WhatsApp">
                  <MessageCircle className="size-4" strokeWidth={1.75} />
                </a>
              </>
            )}
            {student.email && (
              <a href={`mailto:${student.email}`} className={tileAction} aria-label={`Email ${name}`} title="Email">
                <Mail className="size-4" strokeWidth={1.75} />
              </a>
            )}
            {!clear && (
              <Link
                href={`${href}#record-payment`}
                className="relative z-10 ml-1 inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-xs font-medium text-ink-soft transition hover:border-ink/25 hover:text-ink"
              >
                <IndianRupee className="size-3.5" strokeWidth={2} /> Record
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
