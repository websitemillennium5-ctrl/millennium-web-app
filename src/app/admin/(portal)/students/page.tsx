import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getBatches, searchStudents } from "@/lib/data";
import { STUDENTS_PAGE_SIZE, parseStudentQuery, studentQueryHref } from "@/lib/student-query";
import { Pagination } from "@/components/portal/pagination";
import { ScrollReset } from "@/components/portal/scroll-reset";
import { StudentCard } from "@/components/portal/student-card";
import { StudentFilters } from "@/components/portal/student-filters";
import { StudentTable } from "@/components/portal/student-table";
import { Empty, PageTitle } from "@/components/portal/ui";

export default async function StudentsList({ searchParams }: PageProps<"/admin/students">) {
  await requireStaff();
  const query = parseStudentQuery(await searchParams);
  const [{ students, total, pageCount }, batches] = await Promise.all([searchStudents(query), getBatches()]);

  return (
    <>
      <ScrollReset key={query.page} />
      <PageTitle
        title="Students"
        text="Everyone enrolled, with course, batch and fee status at a glance."
        action={
          <Link href="/admin/students/new" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark">
            <Plus className="size-4" /> Add student
          </Link>
        }
      />
      <StudentFilters query={query} total={total} batches={batches} />

      {students.length === 0 ? (
        <Empty>No students match these filters.</Empty>
      ) : query.view === "table" ? (
        <StudentTable students={students} offset={(Math.min(query.page, pageCount) - 1) * STUDENTS_PAGE_SIZE} />
      ) : (
        <ul className="space-y-4">
          {students.map((s) => (
            <StudentCard key={s.id} student={s} href={`/admin/students/${s.id}`} />
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
