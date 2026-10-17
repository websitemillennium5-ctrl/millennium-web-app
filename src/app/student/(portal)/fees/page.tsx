import { requireStudent } from "@/lib/auth";
import { getFees } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/format";
import { Badge, Card, Empty, PageTitle, Stat } from "@/components/portal/ui";

export default async function StudentFees() {
  const profile = await requireStudent();
  const { payments, paid, due } = await getFees(profile.id, profile.fee_total);
  const pct = profile.fee_total > 0 ? Math.min(100, Math.round((paid / profile.fee_total) * 100)) : 0;

  return (
    <>
      <PageTitle title="Fees" text="Your course fee and payment history." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total course fee" value={formatINR(profile.fee_total)} />
        <Stat label="Paid" value={formatINR(paid)} tone="good" />
        <Stat label="Balance due" value={formatINR(due)} tone={due > 0 ? "warn" : "good"} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-line" aria-label={`${pct}% paid`}>
        <div className="h-full rounded-full bg-good/100" style={{ width: `${pct}%` }} />
      </div>

      <Card title="Payment history" className="mt-6">
        {payments.length === 0 ? (
          <Empty>No payments recorded yet.</Empty>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-md text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Method</th>
                  <th className="px-2 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-2 py-3 whitespace-nowrap">{formatDate(p.paid_on)}</td>
                    <td className="px-2 py-3 font-medium">{formatINR(Number(p.amount))}</td>
                    <td className="px-2 py-3">
                      <Badge>{p.method.toUpperCase()}</Badge>
                    </td>
                    <td className="px-2 py-3 text-muted">{p.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
