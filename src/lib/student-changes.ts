import { courseTitle, formatDate, formatINR } from "@/lib/format";

export type ChangeAction = "created" | "updated" | "payment_added" | "payment_deleted" | "password_reset" | "deleted";
/** One edited field: the value before and after (null when it was empty). */
export type FieldChange = { field: string; from: string | number | null; to: string | number | null };
export type StudentChange = {
  id: number;
  student_id: string | null;
  student_name: string;
  staff_id: string | null;
  staff_name: string;
  action: ChangeAction;
  changes: FieldChange[];
  created_at: string;
};

/** The editable student fields, in the order the form shows them. */
export const fieldLabels: Record<string, string> = {
  full_name: "Name",
  phone: "Phone",
  date_of_birth: "Date of birth",
  roll_no: "Roll number",
  student_id: "Student ID",
  batch: "Batch",
  course_slug: "Course",
  fee_total: "Course fee",
  joined_on: "Joined on",
  amount: "Amount",
  method: "Method",
  paid_on: "Paid on",
  note: "Note",
};

export const actionLabels: Record<ChangeAction, string> = {
  created: "created the student",
  updated: "edited details",
  payment_added: "recorded a payment",
  payment_deleted: "deleted a payment",
  password_reset: "reset the password",
  deleted: "deleted the student",
};

/** A field's value as staff would read it: course names, rupees and dates instead of raw values. */
export function showValue(field: string, value: string | number | null) {
  if (value === null || value === "") return "—";
  if (field === "course_slug") return courseTitle(String(value));
  if (field === "fee_total" || field === "amount") return formatINR(Number(value));
  if (field === "date_of_birth" || field === "joined_on" || field === "paid_on") return formatDate(String(value));
  if (field === "method") return String(value).toUpperCase();
  return String(value);
}

/** Field-by-field difference between a student's row before and after an edit. */
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): FieldChange[] {
  const norm = (v: unknown): string | number | null => (v === undefined || v === null || v === "" ? null : typeof v === "number" ? v : String(v));
  return Object.keys(after)
    .filter((key) => key in fieldLabels)
    .map((field) => ({ field, from: norm(before[field]), to: norm(after[field]) }))
    .filter((c) => String(c.from ?? "") !== String(c.to ?? ""));
}
