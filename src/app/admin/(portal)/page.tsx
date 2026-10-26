import Link from "next/link";
import { ArrowRight, Briefcase, IndianRupee, Inbox, Plus, Users, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatINR } from "@/lib/format";
import { leadSources, leadStats, leadStatuses, needsFollowUp } from "@/lib/leads";
import { courses } from "@/lib/site";
import { Card, Empty, PageTitle } from "@/components/portal/ui";
import { BarList, ColumnChart, Delta, KpiTile, Ring, Sparkline, StackedBar } from "@/components/portal/charts";

const DAY = 86_400_000;
const requestTime = () => Date.now();
// Calendar keys in India time, so "today" and "this month" match the front office's day.
const dayKey = (d: Date | number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
const monthName = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const compactINR = (n: number) =>
  n >= 100_000 ? `₹${(n / 100_000).toFixed(n >= 1_000_000 ? 0 : 1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : formatINR(n);

const methodLabels: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", bank: "Bank transfer", other: "Other" };

export default async function AdminOverview() {
  const profile = await requireStaff();
  const supabase = await createClient();

  const [students, payments, leads, jobs, activeJobs, recent] = await Promise.all([
    supabase.from("profiles").select("id, course_slug, fee_total, joined_on").eq("role", "student"),
    supabase.from("fee_payments").select("student_id, amount, paid_on, method"),
    supabase.from("leads").select("id, name, phone, course, source, status, created_at").order("created_at", { ascending: false }),
    supabase.from("all_jobs").select("company").eq("is_active", true).limit(5000),
    supabase.from("all_jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("fee_payments")
      .select("id, amount, paid_on, method, student:profiles!fee_payments_student_id_fkey(id, full_name, roll_no)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const now = requestTime();
  const today = dayKey(now);
  const thisMonth = today.slice(0, 7);
  const studentRows = students.data ?? [];
  const paymentRows = (payments.data ?? []).map((p) => ({ ...p, amount: Number(p.amount) }));
  const leadRows = leads.data ?? [];

  // Fees: monthly collections for the last 6 months, this month vs last.
  const months = Array.from({ length: 6 }, (_, i) => {
    const [y, m] = thisMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1));
    return { key: d.toISOString().slice(0, 7), label: monthName.format(d) };
  });
  const byMonth = months.map((m) => {
    const value = paymentRows.filter((p) => p.paid_on.startsWith(m.key)).reduce((s, p) => s + p.amount, 0);
    return { label: m.label, value, display: formatINR(value) };
  });
  const collectedThisMonth = byMonth[5].value;
  const collectedLastMonth = byMonth[4].value;

  const billed = studentRows.reduce((s, r) => s + Number(r.fee_total), 0);
  const collected = paymentRows.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(billed - collected, 0);

  // Fee status per student.
  const paidBy = new Map<string, number>();
  for (const p of paymentRows) paidBy.set(p.student_id, (paidBy.get(p.student_id) ?? 0) + p.amount);
  const feeStatus = { full: 0, partial: 0, none: 0 };
  for (const s of studentRows) {
    const paid = paidBy.get(s.id) ?? 0;
    const total = Number(s.fee_total);
    if (total > 0 && paid >= total) feeStatus.full++;
    else if (paid > 0) feeStatus.partial++;
    else feeStatus.none++;
  }

  const methods = Object.entries(
    paymentRows.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.method]: (acc[p.method] ?? 0) + p.amount }), {}),
  )
    .map(([method, value]) => ({ label: methodLabels[method] ?? method, value, display: formatINR(value) }))
    .sort((a, b) => b.value - a.value);

  // Students
  const newStudents = studentRows.filter((s) => s.joined_on?.startsWith(thisMonth)).length;
  const lastMonthKey = months[4].key;
  const newStudentsLastMonth = studentRows.filter((s) => s.joined_on?.startsWith(lastMonthKey)).length;
  const byCourse = courses
    .map((c) => ({ label: c.title, value: studentRows.filter((s) => s.course_slug === c.slug).length }))
    .concat([{ label: "Not assigned", value: studentRows.filter((s) => !s.course_slug).length }])
    .filter((c, i, all) => c.value || i < all.length - 1);

  // Leads: daily arrivals over 30 days, this week vs last, and pipeline by status.
  const leadDays = Array.from({ length: 30 }, (_, i) => {
    const key = dayKey(now - (29 - i) * DAY);
    const value = leadRows.filter((l) => dayKey(new Date(l.created_at)) === key).length;
    return { label: dayName.format(new Date(`${key}T00:00:00Z`)), value, display: `${value} lead${value === 1 ? "" : "s"}` };
  });
  const stats = leadStats(leadRows, now);
  const prevWeek = leadRows.filter((l) => {
    const age = now - Date.parse(l.created_at);
    return age >= 7 * DAY && age < 14 * DAY;
  }).length;
  const statusColors: Record<string, string> = { new: "bg-sky-500", contacted: "bg-amber-500", converted: "bg-good", not_interested: "bg-zinc-300" };
  const pipeline = leadStatuses.map((s) => ({ label: s.label, value: leadRows.filter((l) => l.status === s.value).length, color: statusColors[s.value] }));
  const bySource = Object.entries(leadSources)
    .map(([key, label]) => ({ label, value: leadRows.filter((l) => l.source === key).length }))
    .sort((a, b) => b.value - a.value);
  const followUps = leadRows.filter((l) => needsFollowUp(l, now)).slice(0, 5);

  // Jobs: which airlines are hiring most.
  const companyCounts = new Map<string, number>();
  for (const j of jobs.data ?? []) companyCounts.set(j.company, (companyCounts.get(j.company) ?? 0) + 1);
  const topCompanies = [...companyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  return (
    <>
      <PageTitle
        title={`Welcome, ${profile.full_name.split(" ")[0] || "team"}`}
        text={`Institute at a glance · ${formatDate(today)}`}
        action={
          <Link href="/admin/students/new" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark">
            <Plus className="size-4" /> Add student
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Students"
          value={studentRows.length}
          icon={<Users className="size-4" strokeWidth={1.75} />}
          footer={
            <span className="text-xs text-muted">
              <span className="font-medium text-ink">+{newStudents}</span> joined this month
              {newStudentsLastMonth > 0 && ` · ${newStudentsLastMonth} last month`}
            </span>
          }
        />
        <KpiTile
          label="Collected this month"
          value={formatINR(collectedThisMonth)}
          icon={<IndianRupee className="size-4" strokeWidth={1.75} />}
          footer={<Delta current={collectedThisMonth} previous={collectedLastMonth} suffix="vs last month" />}
          chart={<Sparkline values={byMonth.map((m) => m.value)} className="text-good" />}
        />
        <KpiTile
          label="Outstanding fees"
          value={formatINR(outstanding)}
          icon={<Wallet className="size-4" strokeWidth={1.75} />}
          footer={<span className="text-xs text-muted">{formatINR(collected)} collected of {formatINR(billed)}</span>}
          chart={
            <div className="h-2 overflow-hidden rounded-full bg-red-100">
              <div className="h-full rounded-full bg-good" style={{ width: `${billed ? (collected / billed) * 100 : 0}%` }} />
            </div>
          }
        />
        <KpiTile
          label="New leads · 7 days"
          value={stats.week}
          icon={<Inbox className="size-4" strokeWidth={1.75} />}
          footer={<Delta current={stats.week} previous={prevWeek} suffix="vs previous week" />}
          chart={<Sparkline values={leadDays.map((d) => d.value)} />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Fee collections · last 6 months"
          className="lg:col-span-2"
          action={<span className="text-sm font-semibold tabular-nums text-ink">{formatINR(byMonth.reduce((s, m) => s + m.value, 0))}</span>}
        >
          <ColumnChart data={byMonth} highlightLast tone="ink" />
          <p className="mt-3 text-xs text-muted">
            Hover a month for the exact amount. Best month: <span className="font-medium text-ink">{[...byMonth].sort((a, b) => b.value - a.value)[0].label}</span>
            {" "}({compactINR(Math.max(...byMonth.map((m) => m.value)))}).
          </p>
        </Card>

        <Card title="Fee status">
          <div className="flex items-center gap-5">
            <Ring value={billed ? collected / billed : 0} label="collected" />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="text-muted">Billed</p>
              <p className="font-semibold tabular-nums text-ink">{formatINR(billed)}</p>
              <p className="pt-1 text-muted">Still due</p>
              <p className="font-semibold tabular-nums text-red-600">{formatINR(outstanding)}</p>
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <StackedBar
              data={[
                { label: "Paid in full", value: feeStatus.full, color: "bg-good" },
                { label: "Part paid", value: feeStatus.partial, color: "bg-amber-500" },
                { label: "Nothing paid", value: feeStatus.none, color: "bg-red-500" },
              ]}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Leads · last 30 days"
          className="lg:col-span-2"
          action={
            <Link href="/admin/leads" className="inline-flex items-center gap-1 text-[12.5px] text-muted transition hover:text-ink">
              All leads <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <ColumnChart data={leadDays} every={5} height={160} />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
            {bySource.map((s) => (
              <div key={s.label}>
                <p className="text-xs text-muted">{s.label}</p>
                <p className="text-sm font-semibold tabular-nums text-ink">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Lead pipeline">
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-mist px-3 py-2.5">
              <p className="text-xs text-muted">Conversion</p>
              <p className="text-base font-semibold tabular-nums text-ink">{stats.rate === null ? "—" : `${Math.round(stats.rate * 100)}%`}</p>
            </div>
            <div className={`rounded-xl px-3 py-2.5 ${stats.overdue ? "bg-red-50" : "bg-mist"}`}>
              <p className="text-xs text-muted">Overdue follow-ups</p>
              <p className={`text-base font-semibold tabular-nums ${stats.overdue ? "text-red-600" : "text-ink"}`}>{stats.overdue}</p>
            </div>
          </div>
          <StackedBar data={pipeline} />
          <p className="mt-4 text-xs text-muted">
            {stats.total} leads in total · {stats.open} waiting for a first call
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Students by course">
          <BarList data={byCourse} empty="No students yet." />
        </Card>
        <Card
          title="Top hiring airlines"
          action={
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
              <Briefcase className="size-3.5" strokeWidth={1.75} />
              {activeJobs.count ?? 0} active
            </span>
          }
        >
          <BarList data={topCompanies} tone="accent" empty="No active listings." />
        </Card>
        <Card title="Payment methods">
          <BarList data={methods} empty="No payments recorded yet." />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Recent payments">
          {(recent.data ?? []).length === 0 ? (
            <Empty>No payments recorded yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {(recent.data ?? []).map((p) => {
                const student = Array.isArray(p.student) ? p.student[0] : p.student;
                const initials = (student?.full_name ?? "?").split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("");
                return (
                  <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-semibold text-ink-soft">{initials}</span>
                    <Link href={`/admin/students/${student?.id}`} className="min-w-0 flex-1 hover:text-brand">
                      <span className="block truncate font-medium">{student?.full_name}</span>
                      <span className="text-xs text-muted">
                        {formatDate(p.paid_on)} · {methodLabels[p.method] ?? p.method}
                      </span>
                    </Link>
                    <span className="font-semibold tabular-nums text-good">+{formatINR(Number(p.amount))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card
          title="Needs a follow-up"
          action={
            <Link href="/admin/leads?status=new" className="inline-flex items-center gap-1 text-[12.5px] text-muted transition hover:text-ink">
              Open leads <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {followUps.length === 0 ? (
            <Empty>You&apos;re all caught up — no leads waiting more than 2 days.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {followUps.map((l) => {
                const days = Math.floor((now - Date.parse(l.created_at)) / DAY);
                return (
                  <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="size-2 shrink-0 rounded-full bg-red-500" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{l.name}</span>
                      <span className="text-xs text-muted">
                        {l.phone}
                        {l.course && ` · ${l.course}`}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{days}d waiting</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
