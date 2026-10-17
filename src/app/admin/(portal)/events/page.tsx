import { redirect } from "next/navigation";

/** Hiring events now show on the Jobs page; keep old links working. */
export default function AdminEvents() {
  redirect("/admin/jobs");
}
