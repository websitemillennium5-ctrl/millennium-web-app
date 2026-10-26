import { Plane } from "lucide-react";
import type { Profile } from "@/lib/auth";
import { courseStyle } from "@/lib/course-style";
import { courseTitle, formatDate } from "@/lib/format";

/** Three-letter "airport code" for a course, e.g. Aviation Cabin Crew → ACC. */
const code = (text: string) =>
  text
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0].toUpperCase())
    .join("")
    .padEnd(3, "X")
    .slice(0, 3);

/** Bar widths (1–3px) derived from the text, so each student's barcode looks different. */
function barWidths(value: string, count = 34) {
  let seed = [...value].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: count }, () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return 1 + (seed % 3);
  });
}

/** Decorative barcode for the ticket stub. */
function Barcode({ value, className = "" }: { value: string; className?: string }) {
  const bars = barWidths(value);
  return (
    <div className={`flex h-10 items-stretch gap-[2px] ${className}`} aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className="bg-ink" style={{ width: w }} />
      ))}
    </div>
  );
}

function Field({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[9.5px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">{value || "—"}</p>
    </div>
  );
}

/**
 * The student's details as an airline boarding pass: course as the destination, roll number as the seat.
 * Used as the dashboard hero and as the digital ID on the profile page.
 */
export function BoardingPass({ profile, duration }: { profile: Profile; duration?: string }) {
  const style = courseStyle(profile.course_slug);
  const course = courseTitle(profile.course_slug);
  const id = profile.student_id || profile.roll_no || profile.id.slice(0, 8);

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_40px_-28px_rgba(24,24,27,0.45)] sm:flex-row">
      {/* Main ticket */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between px-4 py-2 text-white" style={{ background: `linear-gradient(90deg, ${style.color}, color-mix(in srgb, ${style.color} 65%, black))` }}>
          <span className="text-[11px] font-bold tracking-[0.16em] uppercase">Millennium Academy</span>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-90">
            <Plane className="size-3.5" /> Boarding pass
          </span>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Passenger" value={<span className="text-[15px] uppercase">{profile.full_name || profile.email}</span>} />
            <Field label="Student ID" value={<span className="font-mono">{id}</span>} />
          </div>

          {/* Route: trainee → course */}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-2xl leading-none font-bold tracking-tight text-ink">TRN</p>
              <p className="mt-1 text-[11px] text-muted">Trainee</p>
            </div>
            <div className="relative flex flex-1 items-center">
              <span className="h-px flex-1 border-t border-dashed border-ink/25" />
              <span className="mx-2 flex size-7 items-center justify-center rounded-full text-white" style={{ background: style.color }}>
                <Plane className="size-3.5" />
              </span>
              <span className="h-px flex-1 border-t border-dashed border-ink/25" />
            </div>
            <div className="text-right">
              <p className="text-2xl leading-none font-bold tracking-tight" style={{ color: style.color }}>
                {code(course)}
              </p>
              <p className="mt-1 max-w-[9rem] truncate text-[11px] text-muted">{course}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-dashed border-line pt-3 sm:grid-cols-4">
            <Field label="Flight · Batch" value={profile.batch} />
            <Field label="Seat · Roll no" value={profile.roll_no} />
            <Field label="Boarded" value={formatDate(profile.joined_on)} />
            <Field label="Duration" value={duration} />
          </div>
        </div>
      </div>

      {/* Tear-off stub with perforation notches */}
      <div className="relative flex shrink-0 flex-col justify-between gap-3 border-t-2 border-dashed border-line bg-mist/50 p-4 sm:w-44 sm:border-t-0 sm:border-l-2">
        <span className="absolute -top-2.5 -left-2.5 hidden size-5 rounded-full border border-line bg-white sm:block" aria-hidden />
        <span className="absolute -bottom-2.5 -left-2.5 hidden size-5 rounded-full border border-line bg-white sm:block" aria-hidden />
        <div className="space-y-2.5">
          <Field label="Gate" value="Front office" />
          <Field label="Class" value={<span style={{ color: style.color }}>Trainee crew</span>} />
        </div>
        <div>
          <Barcode value={id} />
          <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-muted">{id.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
