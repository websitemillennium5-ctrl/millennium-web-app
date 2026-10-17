import { createStaff, removeStaff, setStaffRole } from "@/app/admin/actions";
import { requireStaff, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/portal/form";
import { Badge, Card, Field, Input, PageTitle, Select } from "@/components/portal/ui";

export default async function StaffPage() {
  const me = await requireStaff("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").in("role", ["staff", "admin"]).order("created_at");
  const staff = (data ?? []) as Profile[];

  return (
    <>
      <PageTitle title="Staff" text="Staff can manage students, fees, announcements and jobs. Admins can also delete students and manage staff." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Add staff member" className="h-fit lg:col-span-2">
          <ActionForm action={createStaff} resetOnSuccess className="space-y-4">
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

        <Card title="Team" className="lg:col-span-3">
          <ul className="divide-y divide-line">
            {staff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {s.full_name || s.email} {s.id === me.id && <span className="text-xs text-muted">(you)</span>}
                  </p>
                  <p className="text-xs text-muted">{s.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge tone={s.role === "admin" ? "brand" : "default"}>{s.role === "admin" ? "Admin" : "Staff"}</Badge>
                  {s.id !== me.id && (
                    <>
                      <form action={setStaffRole}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="role" value={s.role === "admin" ? "staff" : "admin"} />
                        <button className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-mist hover:text-ink">
                          {s.role === "admin" ? "Make staff" : "Make admin"}
                        </button>
                      </form>
                      <form action={removeStaff}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton message={`Remove ${s.full_name || s.email}'s access?`}>Remove</ConfirmButton>
                      </form>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
