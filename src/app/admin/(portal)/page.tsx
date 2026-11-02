import Link from "next/link";
import { ArrowRight, Briefcase, IndianRupee, Inbox, MessageCircle, Plus, Users, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { allowedPages, canAccess } from "@/lib/portal-pages";
import { ONLINE_WINDOW_MS } from "@/lib/chats";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { leadSources, leadStats, leadStatuses, needsFollowUp } from "@/lib/leads";
import { courses } from "@/lib/site";
import { Card, Empty, PageTitle } from "@/components/portal/ui";
import { AreaChart, BarList, ColumnChart, Delta, KpiTile, Ring, SegmentedBar, Sparkline, viz } from "@/components/portal/charts";

const DAY = 86_400_000;
const requestTime = () => Date.now();
// Calendar keys in India time, so "today" and "this month" match the front office's day.
const dayKey = (d: Date | number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
const hourOf = (d: Date | number) => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(d));
const monthName = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const compactINR = (n: number) =>
  n >= 100_000 ? `₹${(n / 100_000).toFixed(n >= 1_000_000 ? 0 : 1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : formatINR(n);
const hourLabel = (h: number) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);
/** "/airline-jobs/indigo/123" → "Airline jobs", "/" → "Home page" */
const pageLabel = (path: string | null) => {
  const first = (path ?? "/").split("/").filter(Boolean)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, " ") : "Home page";
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const methodLabels: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", bank: "Bank transfer", other: "Other" };

export default async function AdminOverview() {
  const profile = await requireStaff();
  // Staff limited to other pages land on the first one they may open; with none at all, say so instead of looping
  if (!canAccess(profile, "overview")) {
    const first = allowedPages(profile)[0];
    if (first) redirect(first.href);
    return <NoPages />;
  }
  const supabase = await createClient();

  const [students, payments, leads, jobs, activeJobs, recent, chats] = await Promise.all([
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
    supabase
      .from("chat_sessions")
      .select("id, name, page, mode, lead_id, taken_at, started_at, visitor_seen_at, chat_messages(count)")
      .order("started_at", { ascending: false })
      .limit(2000),
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
    .filter((c, i, all) => c.value || i < all.length - 1)
    .sort((a, b) => b.value - a.value);

  // Leads: daily arrivals over 30 days, this week vs last, and pipeline by status.
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const key = dayKey(now - (29 - i) * DAY);
    return { key, label: dayName.format(new Date(`${key}T00:00:00Z`)) };
  });
  const leadDays = days30.map((d) => {
    const value = leadRows.filter((l) => dayKey(new Date(l.created_at)) === d.key).length;
    return { label: d.label, value, display: plural(value, "lead") };
  });
  const stats = leadStats(leadRows, now);
  const prevWeek = leadRows.filter((l) => {
    const age = now - Date.parse(l.created_at);
    return age >= 7 * DAY && age < 14 * DAY;
  }).length;
  const statusColors: Record<string, string> = { new: viz.blue, contacted: viz.amber, converted: viz.green, not_interested: viz.muted };
  const pipeline = leadStatuses.map((s) => ({ label: s.label, value: leadRows.filter((l) => l.status === s.value).length, color: statusColors[s.value] }));
  const bySource = Object.entries(leadSources)
    .map(([key, label]) => ({ label, value: leadRows.filter((l) => l.source === key).length }))
    .sort((a, b) => b.value - a.value);
  const followUps = leadRows.filter((l) => needsFollowUp(l, now)).slice(0, 5);

  // Website chats: volume, what came of them, when visitors chat and from where.
  const chatRows = (chats.data ?? []).map((c) => ({
    ...c,
    startedAt: Date.parse(c.started_at),
    messages: (Array.isArray(c.chat_messages) ? c.chat_messages[0]?.count : undefined) ?? 0,
  }));
  const chatAge = (c: { startedAt: number }) => now - c.startedAt;
  const chats30 = chatRows.filter((c) => chatAge(c) < 30 * DAY);
  const chatsPrev30 = chatRows.filter((c) => chatAge(c) >= 30 * DAY && chatAge(c) < 60 * DAY);
  const chats7 = chatRows.filter((c) => chatAge(c) < 7 * DAY).length;
  const chatsPrev7 = chatRows.filter((c) => chatAge(c) >= 7 * DAY && chatAge(c) < 14 * DAY).length;
  const chatDays = days30.map((d) => {
    const value = chatRows.filter((c) => dayKey(c.startedAt) === d.key).length;
    return { label: d.label, value, display: plural(value, "chat") };
  });
  const outcome = (c: { lead_id: string | null; taken_at: string | null }) => (c.lead_id ? "enquiry" : c.taken_at ? "staff" : "left");
  const outcomes = {
    enquiry: chats30.filter((c) => outcome(c) === "enquiry").length,
    staff: chats30.filter((c) => outcome(c) === "staff").length,
    left: chats30.filter((c) => outcome(c) === "left").length,
  };
  const chatOutcomes = [
    { label: "Became an enquiry", value: outcomes.enquiry, color: viz.green },
    { label: "Handled by staff", value: outcomes.staff, color: viz.blue },
    { label: "Left mid-chat", value: outcomes.left, color: viz.muted },
  ];
  const chatConversion = chats30.length ? outcomes.enquiry / chats30.length : null;
  const takeoverRate = chats30.length ? chats30.filter((c) => c.taken_at).length / chats30.length : null;
  const avgMessages = chats30.length ? chats30.reduce((s, c) => s + c.messages, 0) / chats30.length : 0;
  const liveNow = chatRows.filter((c) => c.mode !== "ended" && now - Date.parse(c.visitor_seen_at) < ONLINE_WINDOW_MS).length;
  const byHour = Array.from({ length: 24 }, (_, h) => {
    const value = chats30.filter((c) => hourOf(c.startedAt) === h).length;
    return { label: hourLabel(h), value, display: plural(value, "chat") };
  });
  const peakHour = byHour.reduce((best, h, i) => (h.value > byHour[best].value ? i : best), 0);
  const pageCounts = new Map<string, number>();
  for (const c of chats30) pageCounts.set(pageLabel(c.page), (pageCounts.get(pageLabel(c.page)) ?? 0) + 1);
  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));
  const recentChats = chatRows.slice(0, 5);
  const outcomeChip: Record<ReturnType<typeof outcome>, { label: string; className: string }> = {
    enquiry: { label: "Enquiry", className: "bg-good/10 text-good" },
    staff: { label: "Staff", className: "bg-sky-50 text-sky-700" },
    left: { label: "Left", className: "bg-mist text-muted" },
  };

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

      {/* ── Headline figures ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label="Students"
          value={studentRows.length}
          icon={<Users strokeWidth={1.75} />}
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
          icon={<IndianRupee strokeWidth={1.75} />}
          footer={<Delta current={collectedThisMonth} previous={collectedLastMonth} suffix="vs last month" />}
          chart={<Sparkline values={byMonth.map((m) => m.value)} color={viz.good} />}
        />
        <KpiTile
          label="Outstanding fees"
          value={formatINR(outstanding)}
          icon={<Wallet strokeWidth={1.75} />}
          footer={<span className="text-xs text-muted">{formatINR(collected)} collected of {formatINR(billed)}</span>}
          chart={
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--color-good) 15%, transparent)" }}>
              <div className="h-full rounded-full" style={{ width: `${billed ? (collected / billed) * 100 : 0}%`, background: viz.good }} />
            </div>
          }
        />
        <KpiTile
          label="New leads · 7 days"
          value={stats.week}
          icon={<Inbox strokeWidth={1.75} />}
          footer={<Delta current={stats.week} previous={prevWeek} suffix="vs previous week" />}
          chart={<Sparkline values={leadDays.map((d) => d.value)} />}
        />
        <KpiTile
          label="Website chats · 7 days"
          value={chats7}
          icon={<MessageCircle strokeWidth={1.75} />}
          footer={<Delta current={chats7} previous={chatsPrev7} suffix="vs previous week" />}
          chart={<Sparkline values={chatDays.map((d) => d.value)} />}
        />
      </div>

      {/* ── Fees ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Fee collections · last 6 months"
          className="lg:col-span-2"
          action={<span className="text-sm font-semibold tabular-nums text-ink">{formatINR(byMonth.reduce((s, m) => s + m.value, 0))}</span>}
        >
          <ColumnChart data={byMonth} highlightLast color={viz.ink} tick={compactINR} />
          <p className="mt-3 text-xs text-muted">
            Best month: <span className="font-medium text-ink">{[...byMonth].sort((a, b) => b.value - a.value)[0].label}</span> ({compactINR(Math.max(...byMonth.map((m) => m.value)))}).
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
            <SegmentedBar
              tall
              data={[
                { label: "Paid in full", value: feeStatus.full, color: viz.green },
                { label: "Part paid", value: feeStatus.partial, color: viz.amber },
                { label: "Nothing paid", value: feeStatus.none, color: viz.red },
              ]}
            />
          </div>
        </Card>
      </div>

      {/* ── Leads ── */}
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
          <AreaChart data={leadDays} every={5} />
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
              <p className="text-base font-semibold text-ink">{stats.rate === null ? "—" : `${Math.round(stats.rate * 100)}%`}</p>
            </div>
            <div className={`rounded-xl px-3 py-2.5 ${stats.overdue ? "bg-red-50" : "bg-mist"}`}>
              <p className="text-xs text-muted">Overdue follow-ups</p>
              <p className={`text-base font-semibold ${stats.overdue ? "text-red-600" : "text-ink"}`}>{stats.overdue}</p>
            </div>
          </div>
          <SegmentedBar tall data={pipeline} />
          <p className="mt-4 text-xs text-muted">
            {stats.total} leads in total · {stats.open} waiting for a first call
          </p>
        </Card>
      </div>

      {/* ── Website chat ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Website chats · last 30 days"
          className="lg:col-span-2"
          action={
            <span className="flex items-center gap-3">
              {liveNow > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-good/10 px-2.5 py-1 text-[11.5px] font-medium text-good">
                  <span className="relative flex size-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
                    <span className="relative size-1.5 rounded-full bg-current" />
                  </span>
                  {plural(liveNow, "visitor")} chatting now
                </span>
              )}
              <Link href="/admin/chats" className="inline-flex items-center gap-1 text-[12.5px] text-muted transition hover:text-ink">
                All chats <ArrowRight className="size-3.5" />
              </Link>
            </span>
          }
        >
          <AreaChart data={chatDays} every={5} />
          <div className="mt-5 grid gap-6 border-t border-line pt-5 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] font-medium text-muted">When visitors chat (IST)</p>
              <ColumnChart data={byHour} every={6} height={88} color={viz.blue} />
              <p className="mt-2 text-xs text-muted">
                Busiest around <span className="font-medium text-ink">{hourLabel(peakHour)}</span>
                {chats30.length === 0 && " · no chats yet"}
              </p>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-medium text-muted">Where chats start</p>
              <BarList data={topPages} empty="No chats yet." />
            </div>
          </div>
        </Card>

        <Card title="Chat insights">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-mist px-3 py-2.5">
              <p className="text-[11px] text-muted">Chats</p>
              <p className="text-base font-semibold text-ink">{chats30.length}</p>
              <p className="text-[10.5px] text-muted">{chatsPrev30.length} before</p>
            </div>
            <div className="rounded-xl bg-mist px-3 py-2.5">
              <p className="text-[11px] text-muted">To enquiry</p>
              <p className="text-base font-semibold text-ink">{chatConversion === null ? "—" : `${Math.round(chatConversion * 100)}%`}</p>
              <p className="text-[10.5px] text-muted">{outcomes.enquiry} saved</p>
            </div>
            <div className="rounded-xl bg-mist px-3 py-2.5">
              <p className="text-[11px] text-muted">Taken over</p>
              <p className="text-base font-semibold text-ink">{takeoverRate === null ? "—" : `${Math.round(takeoverRate * 100)}%`}</p>
              <p className="text-[10.5px] text-muted">by staff</p>
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-3 text-[11px] font-medium text-muted">What came of them</p>
            <SegmentedBar tall data={chatOutcomes} />
          </div>
          <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
            About <span className="font-medium text-ink">{avgMessages ? avgMessages.toFixed(1) : "0"}</span> messages per chat
          </p>
        </Card>
      </div>

      {/* ── Breakdowns ── */}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Students by course">
          <BarList data={byCourse} color={viz.ink} empty="No students yet." />
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
          <BarList data={topCompanies} empty="No active listings." />
        </Card>
        <Card title="Payment methods">
          <BarList data={methods} color={viz.good} empty="No payments recorded yet." />
        </Card>
      </div>

      {/* ── Lists ── */}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        <Card
          title="Recent chats"
          action={
            <Link href="/admin/chats" className="inline-flex items-center gap-1 text-[12.5px] text-muted transition hover:text-ink">
              All chats <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {recentChats.length === 0 ? (
            <Empty>No website chats yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {recentChats.map((c) => {
                const chip = outcomeChip[outcome(c)];
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-semibold text-ink-soft">{(c.name?.trim()[0] ?? "?").toUpperCase()}</span>
                    <Link href={`/admin/chats?chat=${c.id}`} className="min-w-0 flex-1 hover:text-brand">
                      <span className="block truncate font-medium">{c.name ?? "Anonymous visitor"}</span>
                      <span className="text-xs text-muted">
                        {formatDateTime(c.started_at)} · {plural(c.messages, "message")}
                      </span>
                    </Link>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${chip.className}`}>{chip.label}</span>
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

/** Shown to a staff member whose admin has switched off every page for them. */
function NoPages() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold tracking-tight text-ink">No pages assigned yet</h1>
      <p className="mt-2 text-sm text-muted">An admin has not given this account access to any part of the portal. Ask them to pick the pages you need from the Staff page.</p>
    </div>
  );
}
