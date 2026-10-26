import { notFound } from "next/navigation";
import { Banknote, CreditCard, Landmark, Smartphone, Trash2, Wallet } from "lucide-react";
import { addPayment, deletePayment, deleteStudent, resetPassword, updateStudent } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth";
import { getFees, type StudentRow } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatINR } from "@/lib/format";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/portal/form";
import { StudentCard } from "@/components/portal/student-card";
import { StudentFields } from "@/components/portal/student-fields";
import { Badge, Card, Empty, Field, Input, Select, Stat } from "@/components/portal/ui";

const methodIcons: Record<string, typeof Wallet> = { cash: Banknote, upi: Smartphone, card: CreditCard, bank: Landmark };

export default async function StudentDetail({ params }: PageProps<"/admin/students/[id]">) {
  const me = await requireStaff();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.from("student_overview").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const student = { ...data, paid: Number(data.paid), due: Number(data.due), fee_total: Number(data.fee_total) } as StudentRow;
  const { payments } = await getFees(student.id, student.fee_total);

  return (
    <>
      <StudentCard student={student} as="section" />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Course fee" value={formatINR(student.fee_total)} />
        <Stat label="Paid" value={formatINR(student.paid)} tone="good" />
        <Stat label="Balance due" value={formatINR(student.due)} tone={student.due > 0 ? "warn" : "good"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Details">
            <ActionForm action={updateStudent.bind(null, student.id)} className="space-y-5">
              <StudentFields student={student} />
              <SubmitButton>Save changes</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Payments">
            {payments.length === 0 ? (
              <Empty>No payments recorded yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p) => {
                  const Method = methodIcons[p.method] ?? Wallet;
                  return (
                  <li key={p.id} className="flex items-center gap-3 py-3 text-sm first:pt-0 last:pb-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-good/20 bg-good/10 text-good">
                      <Method className="size-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-ink">{formatINR(Number(p.amount))}</span> <Badge>{p.method.toUpperCase()}</Badge>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {formatDate(p.paid_on)}
                        {p.note && ` · ${p.note}`}
                      </span>
                    </div>
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="student_id" value={student.id} />
                      <ConfirmButton message="Delete this payment record?" icon={<Trash2 className="size-4" strokeWidth={1.75} />}>
                        Delete payment
                      </ConfirmButton>
                    </form>
                  </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Record a payment" id="record-payment">
            <ActionForm action={addPayment.bind(null, student.id)} resetOnSuccess className="space-y-4">
              <Field label="Amount (₹) *">
                <Input name="amount" inputMode="numeric" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <Input name="paid_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </Field>
                <Field label="Method">
                  <Select name="method" defaultValue="cash">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank transfer</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
              </div>
              <Field label="Note">
                <Input name="note" placeholder="Receipt no., instalment…" />
              </Field>
              <SubmitButton>Add payment</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Login">
            <p className="mb-4 text-sm text-muted">Student forgot their password? Generate a new one and share it with them.</p>
            <ActionForm action={resetPassword.bind(null, student.id)} className="space-y-3">
              <SubmitButton variant="ghost">Reset password</SubmitButton>
            </ActionForm>
          </Card>

          {me.role === "admin" && (
            <Card title="Danger zone">
              <p className="mb-3 text-sm text-muted">Deletes the student&apos;s login, profile and payment history.</p>
              <form action={deleteStudent}>
                <input type="hidden" name="id" value={student.id} />
                <ConfirmButton message={`Permanently delete ${student.full_name}? This can't be undone.`}>Delete student</ConfirmButton>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
