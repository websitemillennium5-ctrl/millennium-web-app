import { redirect } from "next/navigation";

/** Hiring events now show on the Jobs page; keep old links working. */
export default function StudentEvents() {
  redirect("/student/jobs");
}
