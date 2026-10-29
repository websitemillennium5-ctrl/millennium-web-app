import type { Profile } from "@/lib/auth";
import { CourseSelect, Field, Input } from "@/components/portal/ui";

/** Shared inputs for creating and editing a student. */
export function StudentFields({ student }: { student?: Profile }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Full name *">
        <Input name="full_name" required defaultValue={student?.full_name} />
      </Field>
      <Field label="Phone">
        <Input name="phone" type="tel" defaultValue={student?.phone ?? ""} placeholder="+91" />
      </Field>
      <Field label="Date of birth">
        <Input name="date_of_birth" type="date" defaultValue={student?.date_of_birth ?? ""} max={new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label="Roll number" hint="Students can sign in with this instead of email.">
        <Input name="roll_no" defaultValue={student?.roll_no ?? ""} placeholder="MAA2026-014" />
      </Field>
      <Field label="Student ID">
        <Input name="student_id" defaultValue={student?.student_id ?? ""} placeholder="STU-0142" />
      </Field>
      <Field label="Batch">
        <Input name="batch" defaultValue={student?.batch ?? ""} placeholder="Jan 2026 · Morning" />
      </Field>
      <Field label="Course">
        <CourseSelect defaultValue={student?.course_slug} />
      </Field>
      <Field label="Total course fee (₹)">
        <Input name="fee_total" inputMode="numeric" defaultValue={student ? String(student.fee_total) : "0"} />
      </Field>
      <Field label="Joined on">
        <Input name="joined_on" type="date" defaultValue={student?.joined_on ?? new Date().toISOString().slice(0, 10)} />
      </Field>
    </div>
  );
}
