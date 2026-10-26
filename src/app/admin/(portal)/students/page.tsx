import Link from "next/link";
import { CircleAlert, CircleCheck, Plus, SearchX, UserPlus, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getBatches, getStudentSummary, searchStudents } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { STUDENTS_PAGE_SIZE, parseStudentQuery, studentQueryHref, type StudentQuery } from "@/lib/student-query";
import { Pagination } from "@/components/portal/pagination";
import { ScrollReset } from "@/components/portal/scroll-reset";
import { StudentTile } from "@/components/portal/student-card";
import { StudentFilters } from "@/components/portal/student-filters";
import { StudentTable } from "@/components/portal/student-table";
import { PageTitle } from "@/components/portal/ui";

/** Summary tile that doubles as a one-click filter; highlighted while its filter is on. */
function SummaryTile({
  href,
  active,
  icon,
  label,
  value,
  hint,
  tone,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  tone: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active || undefined}
      className={`group flex items-center gap-3 rounded-2xl border bg-white p-3.5 transition hover:border-ink/20 hover:shadow-[0_8px_24px_-18px_rgba(24,24,27,0.4)] ${
        active ? "border-ink/40 ring-4 ring-ink/5" : "border-line"
      }`}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone} [&_svg]:size-4`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs text-muted">{label}</span>
        <span className="block text-base leading-tight font-semibold tabular-nums text-ink">{value}</span>
        <span className="block truncate text-[11px] text-muted">{hint}</span>
      </span>
    </Link>
  );
}

export default async function StudentsList({ searchParams }: PageProps<"/admin/students">) {
  await requireStaff();
  const query = parseStudentQuery(await searchParams);
  const [{ students, total, pageCount }, batches, summary] = await Promise.all([searchStudents(query), getBatches(), getStudentSummary()]);
  const toggle = (changes: Partial<StudentQuery>, on: boolean) =>
    studentQueryHref(query, on ? { fees: "", joined: "" } : { fees: "", joined: "", ...changes });
  const filtered = Boolean(query.q || query.course || query.batch || query.fees || query.joined);

  return (
    <>
      <ScrollReset key={query.page} />
      <PageTitle
        title="Students"
        text="Find a student, check their fees, and get in touch."
        action={
          <Link href="/admin/students/new" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark">
            <Plus className="size-4" /> Add student
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          href={studentQueryHref(query, { fees: "", joined: "" })}
          active={!query.fees && !query.joined}
          icon={<Users className="size-5" strokeWidth={1.75} />}
          tone="bg-mist text-ink-soft"
          label="Enrolled"
          value={summary.total}
          hint="All students"
        />
        <SummaryTile
          href={toggle({ fees: "due" }, query.fees === "due")}
          active={query.fees === "due"}
          icon={<CircleAlert className="size-5" strokeWidth={1.75} />}
          tone="bg-red-50 text-red-600"
          label="Balance due"
          value={summary.owing}
          hint={`${formatINR(summary.dueAmount)} to collect`}
        />
        <SummaryTile
          href={toggle({ fees: "paid" }, query.fees === "paid")}
          active={query.fees === "paid"}
          icon={<CircleCheck className="size-5" strokeWidth={1.75} />}
          tone="bg-good/10 text-good"
          label="Fully paid"
          value={summary.paid}
          hint={summary.total ? `${Math.round((summary.paid / summary.total) * 100)}% of students` : "—"}
        />
        <SummaryTile
          href={toggle({ joined: "30" }, query.joined === "30")}
          active={query.joined === "30"}
          icon={<UserPlus className="size-5" strokeWidth={1.75} />}
          tone="bg-sky-50 text-sky-700"
          label="New this month"
          value={summary.recent}
          hint="Joined in the past 30 days"
        />
      </div>

      <StudentFilters query={query} total={total} batches={batches} courseCounts={summary.byCourse} allCount={summary.total} />

      {students.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-mist text-muted">
            {filtered ? <SearchX className="size-6" strokeWidth={1.5} /> : <Users className="size-6" strokeWidth={1.5} />}
          </span>
          <p className="mt-4 font-medium text-ink">{filtered ? "No students match these filters" : "No students yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {filtered ? "Try a different search or clear the filters to see everyone." : "Add your first student to start tracking courses and fees."}
          </p>
          <Link
            href={filtered ? studentQueryHref({ ...query, q: "", course: "", batch: "", fees: "", joined: "" }) : "/admin/students/new"}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-soft"
          >
            {filtered ? "Clear filters" : (
              <>
                <Plus className="size-4" /> Add student
              </>
            )}
          </Link>
        </div>
      ) : query.view === "table" ? (
        <StudentTable students={students} offset={(Math.min(query.page, pageCount) - 1) * STUDENTS_PAGE_SIZE} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => (
            <StudentTile key={s.id} student={s} href={`/admin/students/${s.id}`} />
          ))}
        </ul>
      )}

      <Pagination
        page={Math.min(query.page, pageCount)}
        pageCount={pageCount}
        total={total}
        pageSize={STUDENTS_PAGE_SIZE}
        href={(page) => studentQueryHref(query, { page })}
      />
    </>
  );
}
