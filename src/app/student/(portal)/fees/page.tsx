import { Banknote, CircleCheck, CreditCard, Landmark, MapPin, Phone, Receipt, Smartphone, Wallet } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getFees } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/format";
import { site, telHref } from "@/lib/site";
import { Ring } from "@/components/portal/charts";
import { Card, PageTitle } from "@/components/portal/ui";

const methods: Record<string, { label: string; icon: typeof Wallet; tone: string }> = {
  cash: { label: "Cash", icon: Banknote, tone: "bg-emerald-50 text-emerald-700" },
  upi: { label: "UPI", icon: Smartphone, tone: "bg-violet-50 text-violet-700" },
  card: { label: "Card", icon: CreditCard, tone: "bg-sky-50 text-sky-700" },
  bank: { label: "Bank transfer", icon: Landmark, tone: "bg-amber-50 text-amber-700" },
};
const otherMethod = { label: "Other", icon: Wallet, tone: "bg-mist text-ink-soft" };

export default async function StudentFees() {
  const profile = await requireStudent();
  const { payments, paid, due } = await getFees(profile.id, profile.fee_total);
  const total = Number(profile.fee_total);
  const share = total > 0 ? Math.min(paid / total, 1) : 1;

  // Balance left after each payment (payments are newest first, so everything after index i came earlier).
  const timeline = payments.map((p, i) => ({
    ...p,
    balance: Math.max(total - payments.slice(i).reduce((s, q) => s + Number(q.amount), 0), 0),
  }));

  return (
    <>
      <PageTitle title="Fees" text="Your course fee, what you've paid and what's left." />

      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <Ring value={share} size={112} label="paid" />
          <div>
            {due > 0 ? (
              <>
                <p className="text-xs text-muted">Balance due</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-ink">{formatINR(due)}</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  You&apos;ve paid <span className="font-medium text-ink">{formatINR(paid)}</span> of {formatINR(total)}. Keep going ✈️
                </p>
              </>
            ) : (
              <>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-good/10 px-2.5 py-0.5 text-xs font-semibold text-good">
                  <CircleCheck className="size-3.5" /> Fully paid
                </p>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-ink">{formatINR(paid)}</p>
                <p className="mt-1 text-[12.5px] text-muted">Your course fee is all settled. Nothing more to pay.</p>
              </>
            )}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-red-100">
              <div className="h-full rounded-full bg-good" style={{ width: `${share * 100}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted">
              <span>₹0</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line bg-mist/40">
          {[
            ["Course fee", formatINR(total), "text-ink"],
            ["Paid", formatINR(paid), "text-good"],
            ["Due", formatINR(due), due > 0 ? "text-red-600" : "text-good"],
          ].map(([label, value, tone]) => (
            <div key={label} className="px-4 py-2.5">
              <p className="text-[11px] text-muted">{label}</p>
              <p className={`text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_18rem]">
        <Card title="Payment history" action={<span className="text-[11px] text-muted">{payments.length} {payments.length === 1 ? "payment" : "payments"}</span>}>
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-mist text-muted">
                <Receipt className="size-5" strokeWidth={1.5} />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">No payments yet</p>
              <p className="mt-1 text-xs text-muted">Payments made at the front office show up here.</p>
            </div>
          ) : (
            <ol className="relative">
              {timeline.map((p, i) => {
                const m = methods[p.method] ?? otherMethod;
                const Icon = m.icon;
                return (
                  <li key={p.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < timeline.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-line" aria-hidden />}
                    <span className={`relative flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${m.tone}`}>
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1 rounded-xl border border-line px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tabular-nums text-good">+{formatINR(Number(p.amount))}</p>
                        <p className="text-[11.5px] text-muted">
                          {formatDate(p.paid_on)} · {m.label}
                          {p.note && ` · ${p.note}`}
                        </p>
                      </div>
                      <p className="text-right text-[11.5px] text-muted">
                        {p.balance > 0 ? (
                          <>
                            Balance after
                            <span className="block font-medium tabular-nums text-ink">{formatINR(p.balance)}</span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-good">
                            <CircleCheck className="size-3.5" /> Cleared
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card title="How to pay">
          <ul className="space-y-3 text-[12.5px] text-ink-soft">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
              <span>Pay at the front office by cash, UPI, card or bank transfer.</span>
            </li>
            <li className="flex gap-2.5">
              <Receipt className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
              <span>Ask for a receipt. Payments appear here as soon as they&apos;re recorded.</span>
            </li>
          </ul>
          <a
            href={telHref(site.phones[0])}
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-ink py-2 text-sm font-medium text-white transition hover:bg-ink-soft"
          >
            <Phone className="size-3.5" /> Call front office
          </a>
        </Card>
      </div>
    </>
  );
}
