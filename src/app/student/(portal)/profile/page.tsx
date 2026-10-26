import { CalendarDays, GraduationCap, Hash, IdCard, KeyRound, Mail, Phone, UserRound, UsersRound } from "lucide-react";
import { changePassword } from "@/app/actions/auth";
import { requireStudent } from "@/lib/auth";
import { courseTitle, formatDate } from "@/lib/format";
import { getCourse, site, telHref } from "@/lib/site";
import { BoardingPass } from "@/components/portal/boarding-pass";
import { CopyButton } from "@/components/portal/copy-button";
import { ActionForm, SubmitButton } from "@/components/portal/form";
import { Card, Field, Input, PageTitle } from "@/components/portal/ui";

export default async function StudentProfile() {
  const profile = await requireStudent();
  const course = profile.course_slug ? getCourse(profile.course_slug) : undefined;
  const rows = [
    { icon: UserRound, label: "Name", value: profile.full_name },
    { icon: IdCard, label: "Student ID", value: profile.student_id, copy: true },
    { icon: Hash, label: "Roll number", value: profile.roll_no, copy: true },
    { icon: Mail, label: "Email", value: profile.email },
    { icon: Phone, label: "Phone", value: profile.phone },
    { icon: GraduationCap, label: "Course", value: courseTitle(profile.course_slug) },
    { icon: UsersRound, label: "Batch", value: profile.batch },
    { icon: CalendarDays, label: "Joined", value: formatDate(profile.joined_on) },
  ];

  return (
    <>
      <PageTitle title="Profile" text="Your digital student pass and account details." />

      <BoardingPass profile={profile} duration={course?.duration} />

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <Card
          title="Your details"
          action={
            <a href={telHref(site.phones[0])} className="text-[11.5px] font-medium text-muted hover:text-ink">
              Something wrong? Call us
            </a>
          }
        >
          <dl className="grid gap-2 sm:grid-cols-2">
            {rows.map(({ icon: Icon, label, value, copy }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mist text-ink-soft">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] text-muted">{label}</dt>
                  <dd className="truncate text-[13px] font-medium text-ink">{value || "—"}</dd>
                </div>
                {copy && value && <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} />}
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Change password">
          <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-mist/60 px-3 py-2 text-[11.5px] text-muted">
            <KeyRound className="size-4 shrink-0" strokeWidth={1.75} />
            Use at least 8 characters. You&apos;ll stay signed in on this device.
          </div>
          <ActionForm action={changePassword} resetOnSuccess className="space-y-3.5">
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
