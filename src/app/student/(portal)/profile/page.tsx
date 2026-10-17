import { changePassword } from "@/app/actions/auth";
import { requireStudent } from "@/lib/auth";
import { courseTitle, formatDate } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/portal/form";
import { Card, Field, Input, PageTitle } from "@/components/portal/ui";

export default async function StudentProfile() {
  const profile = await requireStudent();
  const rows = [
    ["Name", profile.full_name],
    ["Student ID", profile.student_id],
    ["Roll number", profile.roll_no],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Course", courseTitle(profile.course_slug)],
    ["Batch", profile.batch],
    ["Joined", formatDate(profile.joined_on)],
  ];

  return (
    <>
      <PageTitle title="Profile" text="To correct any details, contact the front office." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your details">
          <dl className="divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium text-ink">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Change password">
          <ActionForm action={changePassword} resetOnSuccess className="space-y-4">
            <Field label="New password">
              <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label="Confirm new password">
              <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <SubmitButton>Update password</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
