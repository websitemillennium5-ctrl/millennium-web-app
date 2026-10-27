import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronRight, CircleCheck, GraduationCap, Hash, IdCard, IndianRupee, KeyRound, Mail, Phone, UserRound, UsersRound } from "lucide-react";
import { changePassword } from "@/app/actions/auth";
import { requireStudent } from "@/lib/auth";
import { getFees } from "@/lib/data";
import { courseTitle, formatDate, formatINR } from "@/lib/format";
import { getCourse, site, telHref } from "@/lib/site";
import { BoardingPass } from "@/components/portal/boarding-pass";
import { CopyButton } from "@/components/portal/copy-button";
import { ActionForm, SubmitButton } from "@/components/portal/form";
import { Card, Field, Input, PageTitle } from "@/components/portal/ui";

export default async function StudentProfile() {
  const profile = await requireStudent();
  const course = profile.course_slug ? getCourse(profile.course_slug) : undefined;
  const fees = await getFees(profile.id, profile.fee_total);
  const paidShare = profile.fee_total > 0 ? Math.min(fees.paid / profile.fee_total, 1) : 1;
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

      <Link
        href="/student/fees"
        className="group mt-5 flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4 transition hover:border-ink/15 hover:shadow-[0_10px_28px_-20px_rgba(24,24,27,0.45)] active:scale-[0.99]"
      >
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${fees.due > 0 ? "bg-amber-50 text-amber-700" : "bg-good/10 text-good"}`}>
          {fees.due > 0 ? <IndianRupee className="size-5" /> : <CircleCheck className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[13.5px] font-semibold text-ink">Fees &amp; payments</span>
            <span className={`text-[12px] font-semibold tabular-nums ${fees.due > 0 ? "text-red-600" : "text-good"}`}>
              {fees.due > 0 ? `${formatINR(fees.due)} due` : "All paid"}
            </span>
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-mist">
            <span className="block h-full rounded-full bg-good" style={{ width: `${Math.round(paidShare * 100)}%` }} />
          </span>
          <span className="mt-1.5 block text-[11.5px] text-muted">
            {Math.round(paidShare * 100)}% paid · payment history and how to pay
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_20rem]">
        {/* Collapsible, settings-style list of the student's details (closed by default to keep the page short) */}
        <details className="group/details overflow-hidden rounded-2xl border border-line bg-white [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 transition select-none hover:bg-mist/50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#a7222d]/10 text-[#a7222d]">
              <IdCard className="size-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-ink">Your details</span>
              <span className="block truncate text-[11.5px] text-muted">
                {[profile.full_name, profile.roll_no && `Roll ${profile.roll_no}`, profile.batch && `Batch ${profile.batch}`].filter(Boolean).join(" · ")}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-300 group-open/details:rotate-180" />
          </summary>

          <dl className="divide-y divide-line border-t border-line">
            {rows.map(({ icon: Icon, label, value, copy }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                <dt className="w-[5.5rem] shrink-0 text-[12px] text-muted">{label}</dt>
                <dd className="min-w-0 flex-1 text-right text-[13px] font-medium [overflow-wrap:anywhere] text-ink">{value || "—"}</dd>
                {copy && value ? <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} /> : null}
              </div>
            ))}
          </dl>

          <a
            href={telHref(site.phones[0])}
            className="flex items-center justify-center gap-1.5 border-t border-line bg-mist/40 px-4 py-2.5 text-[12px] font-medium text-ink-soft transition hover:bg-mist hover:text-ink"
          >
            <Phone className="size-3.5" /> Something wrong? Call the front office
          </a>
        </details>

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
