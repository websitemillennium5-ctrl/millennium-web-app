import Link from "next/link";
import { createStudent } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/portal/form";
import { StudentFields } from "@/components/portal/student-fields";
import { Card, Field, Input, PageTitle } from "@/components/portal/ui";

export default async function NewStudent() {
  await requireStaff();
  return (
    <>
      <PageTitle title="Add student" text="Creates the student's login. Share the roll number/email and password with them." />
      <Card className="max-w-3xl">
        <ActionForm action={createStudent} resetOnSuccess className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email *">
              <Input name="email" type="email" required autoComplete="off" />
            </Field>
            <Field label="Password" hint="Leave blank to generate one.">
              <Input name="password" type="text" autoComplete="off" minLength={8} />
            </Field>
          </div>
          <StudentFields />
          <div className="flex items-center gap-3">
            <SubmitButton variant="accent">Create student</SubmitButton>
            <Link href="/admin/students" className="text-sm text-muted hover:text-ink">
              Back to list
            </Link>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
