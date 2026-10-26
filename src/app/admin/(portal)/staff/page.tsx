import { ShieldCheck, UserRound } from "lucide-react";
import { createStaff, removeStaff, setStaffRole } from "@/app/admin/actions";
import { requireStaff, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/portal/form";
import { Card, Field, Input, PageTitle, Select } from "@/components/portal/ui";
import { initials } from "@/components/portal/student-card";

export default async function StaffPage() {
  const me = await requireStaff("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").in("role", ["staff", "admin"]).order("created_at");
  const staff = (data ?? []) as Profile[];

  return (
    <>
      <PageTitle title="Staff" text="Staff can manage students, fees, announcements and jobs. Admins can also delete students and manage staff." />
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <Card title="Add staff member" className="h-fit lg:col-span-2">
          <ActionForm action={createStaff} resetOnSuccess className="space-y-3.5">
            <Field label="Full name *">
              <Input name="full_name" required />
            </Field>
            <Field label="Email *">
              <Input name="email" type="email" required autoComplete="off" />
            </Field>
            <Field label="Phone">
              <Input name="phone" type="tel" />
            </Field>
            <Field label="Password" hint="Leave blank to generate one.">
              <Input name="password" autoComplete="off" minLength={8} />
            </Field>
            <Field label="Access">
              <Select name="role" defaultValue="staff">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <SubmitButton>Create account</SubmitButton>
          </ActionForm>
        </Card>

        <Card title="Team" className="lg:col-span-3" action={<span className="text-xs text-muted">{staff.length} {staff.length === 1 ? "member" : "members"}</span>}>
          <ul className="divide-y divide-line">
            {staff.map((s) => {
              const admin = s.role === "admin";
              return (
                <li key={s.id} className="group flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${admin ? "bg-accent text-white" : "bg-mist text-ink-soft"}`}
                  >
                    {initials(s.full_name || s.email || "")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <span className="truncate">{s.full_name || s.email}</span>
                      {s.id === me.id && <span className="rounded-full bg-mist px-1.5 text-[10.5px] font-medium text-muted">You</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {s.email}
                      {s.phone && ` · ${s.phone}`}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      admin ? "border-accent/20 bg-accent/10 text-accent-dark" : "border-line bg-mist text-ink-soft"
                    }`}
                  >
                    {admin ? <ShieldCheck className="size-3" /> : <UserRound className="size-3" />}
                    {admin ? "Admin" : "Staff"}
                  </span>
                  {s.id !== me.id && (
                    <div className="flex items-center gap-0.5 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <form action={setStaffRole}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="role" value={admin ? "staff" : "admin"} />
                        <button className="rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:bg-mist hover:text-ink">
                          {admin ? "Make staff" : "Make admin"}
                        </button>
                      </form>
                      <form action={removeStaff}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton message={`Remove ${s.full_name || s.email}'s access?`}>Remove</ConfirmButton>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
