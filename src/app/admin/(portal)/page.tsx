import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatINR } from "@/lib/format";
import { courses } from "@/lib/site";
import { Card, Empty, Meter, PageTitle, Stat } from "@/components/portal/ui";

export default async function AdminOverview() {
  const profile = await requireStaff();
  const supabase = await createClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [students, payments, monthPayments, jobs, recent] = await Promise.all([
    supabase.from("profiles").select("course_slug, fee_total").eq("role", "student"),
    supabase.from("fee_payments").select("amount"),
    supabase.from("fee_payments").select("amount").gte("paid_on", monthStart),
    supabase.from("all_jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("fee_payments")
      .select("id, amount, paid_on, method, student:profiles!fee_payments_student_id_fkey(id, full_name, roll_no)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const studentRows = students.data ?? [];
  const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const billed = studentRows.reduce((s, r) => s + Number(r.fee_total), 0);
  const collected = sum(payments.data);
  const byCourse = courses.map((c) => ({ ...c, count: studentRows.filter((s) => s.course_slug === c.slug).length }));

  return (
    <>
      <PageTitle
        title={`Welcome, ${profile.full_name.split(" ")[0] || "team"}`}
        text="Institute at a glance."
        action={
          <Link href="/admin/students/new" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark">
            <Plus className="size-4" /> Add student
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={studentRows.length} />
        <Stat label="Collected this month" value={formatINR(sum(monthPayments.data))} tone="good" />
        <Stat
          label="Outstanding fees"
          value={formatINR(Math.max(billed - collected, 0))}
          tone="warn"
          meter={billed ? collected / billed : 0}
          hint={`${formatINR(collected)} collected of ${formatINR(billed)}`}
        />
        <Stat label="Active job listings" value={jobs.count ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Students by course">
          <ul className="divide-y divide-line">
            {byCourse.map((c) => (
              <li key={c.slug} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-ink-soft">{c.title}</span>
                <span className="flex items-center gap-3">
                  <Meter value={studentRows.length ? c.count / studentRows.length : 0} tone="ink" segments={8} />
                  <span className="w-6 text-right text-sm font-medium">{c.count}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent payments">
          {(recent.data ?? []).length === 0 ? (
            <Empty>No payments recorded yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {(recent.data ?? []).map((p) => {
                const student = Array.isArray(p.student) ? p.student[0] : p.student;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/admin/students/${student?.id}`} className="min-w-0 hover:text-brand">
                      <span className="block truncate font-medium">{student?.full_name}</span>
                      <span className="text-xs text-muted">
                        {formatDate(p.paid_on)} · {p.method.toUpperCase()}
                      </span>
                    </Link>
                    <span className="font-semibold text-good">{formatINR(Number(p.amount))}</span>
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
