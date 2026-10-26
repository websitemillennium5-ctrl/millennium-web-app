"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions/auth";
import { requireStaff } from "@/lib/auth";
import { eventTable, jobTable } from "@/lib/job-sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { scrapers } from "@/lib/sync";

const text = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
};

const money = (fd: FormData, key: string) => {
  const n = Number(String(fd.get(key) ?? "").replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Readable temporary password, e.g. "Fly-k7m2q9xd" (no 0/O/1/l to avoid mix-ups when read out). */
function tempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return "Fly-" + Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join("");
}

function studentFields(fd: FormData) {
  return {
    full_name: text(fd, "full_name") ?? "",
    phone: text(fd, "phone"),
    roll_no: text(fd, "roll_no"),
    student_id: text(fd, "student_id"),
    course_slug: text(fd, "course_slug"),
    batch: text(fd, "batch"),
    fee_total: money(fd, "fee_total"),
    joined_on: text(fd, "joined_on") ?? undefined,
  };
}

const friendly = (message: string) =>
  message.includes("roll_no")
    ? "That roll number is already in use."
    : message.includes("student_id")
      ? "That student ID is already in use."
      : message.includes("already been registered")
      ? "An account with that email already exists."
      : message;

// ───────── Students ─────────

export async function createStudent(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireStaff();
  const email = text(fd, "email")?.toLowerCase();
  const fields = studentFields(fd);
  if (!email || !fields.full_name) return { error: "Name and email are required." };
  if (Number.isNaN(fields.fee_total)) return { error: "Enter a valid course fee." };

  const password = text(fd, "password") ?? tempPassword();
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fields.full_name },
    app_metadata: { role: "student" },
  });
  if (error || !data.user) return { error: friendly(error?.message ?? "Could not create the account.") };

  const { error: profileError } = await admin.from("profiles").update(fields).eq("id", data.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: friendly(profileError.message) };
  }

  revalidatePath("/admin/students");
  return { ok: `Account created for ${fields.full_name}. Login: ${fields.roll_no ?? email} · Password: ${password}` };
}

export async function updateStudent(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireStaff();
  const fields = studentFields(fd);
  if (!fields.full_name) return { error: "Name is required." };
  if (Number.isNaN(fields.fee_total)) return { error: "Enter a valid course fee." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(fields).eq("id", id).eq("role", "student");
  if (error) return { error: friendly(error.message) };

  revalidatePath(`/admin/students/${id}`);
  revalidatePath("/admin/students");
  return { ok: "Saved." };
}

export async function resetPassword(id: string): Promise<FormState> {
  await requireStaff();
  // Staff may only reset student passwords; staff/admin accounts are managed by admins
  const { data: target } = await (await createClient()).from("profiles").select("role").eq("id", id).single();
  if (target?.role !== "student") return { error: "Only student passwords can be reset here." };

  const password = tempPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
  if (error) return { error: error.message };
  return { ok: `New password: ${password} — share it with the student.` };
}

export async function deleteStudent(fd: FormData) {
  await requireStaff("admin");
  const id = String(fd.get("id"));
  const { data: target } = await (await createClient()).from("profiles").select("role").eq("id", id).single();
  if (target?.role !== "student") return;
  await createAdminClient().auth.admin.deleteUser(id);
  revalidatePath("/admin/students");
  redirect("/admin/students");
}

// ───────── Fees ─────────

export async function addPayment(studentId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const amount = money(fd, "amount");
  if (!amount || Number.isNaN(amount)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { error } = await supabase.from("fee_payments").insert({
    student_id: studentId,
    amount,
    paid_on: text(fd, "paid_on") ?? undefined,
    method: text(fd, "method") ?? "cash",
    note: text(fd, "note"),
    created_by: staff.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/students/${studentId}`);
  return { ok: "Payment recorded." };
}

export async function deletePayment(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("fee_payments").delete().eq("id", String(fd.get("id")));
  revalidatePath(`/admin/students/${String(fd.get("student_id"))}`);
}

// ───────── Announcements ─────────

export async function createAnnouncement(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const title = text(fd, "title");
  if (!title) return { error: "Add a title." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    body: text(fd, "body") ?? "",
    course_slug: text(fd, "course_slug"),
    pinned: fd.get("pinned") === "on",
    created_by: staff.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  return { ok: "Announcement posted." };
}

export async function toggleAnnouncementPin(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("announcements").update({ pinned: fd.get("pinned") !== "true" }).eq("id", String(fd.get("id")));
  revalidatePath("/admin/announcements");
}

export async function deleteAnnouncement(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", String(fd.get("id")));
  revalidatePath("/admin/announcements");
}

// ───────── Jobs ─────────

export async function toggleJob(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from(jobTable(String(fd.get("source")))).update({ is_active: fd.get("active") !== "true" }).eq("id", String(fd.get("id")));
  revalidatePath("/admin/jobs", "layout"); // the list and any open detail page
}

export async function deleteJob(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from(jobTable(String(fd.get("source")))).delete().eq("id", String(fd.get("id")));
  revalidatePath("/admin/jobs", "layout");
  if (fd.get("from") === "detail") redirect("/admin/jobs"); // the detail page would 404 now
}

// ───────── Hiring events ─────────

export async function toggleEvent(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from(eventTable(String(fd.get("source")))).update({ is_active: fd.get("active") !== "true" }).eq("id", String(fd.get("id")));
  revalidatePath("/admin/jobs", "layout"); // the list and any open detail page
}

export async function deleteEvent(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from(eventTable(String(fd.get("source")))).delete().eq("id", String(fd.get("id")));
  revalidatePath("/admin/jobs", "layout");
  if (fd.get("from") === "detail") redirect("/admin/jobs"); // the detail page would 404 now
}

// ───────── Listing sync (run by the local worker) ─────────

export async function requestSync(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const known = new Set(scrapers.map((s) => s.name));
  const picked = fd.getAll("source").map(String).filter((name) => known.has(name));
  if (picked.length === 0) return { error: "Pick at least one source." };

  const supabase = await createClient();
  const { count } = await supabase.from("sync_runs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]);
  if (count) return { error: "A sync is already queued or running. Wait for it to finish or cancel it." };

  const { error } = await supabase.from("sync_runs").insert({
    sources: picked.length === known.size ? null : picked,
    requested_by: staff.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/sync");
  return { ok: `Sync of ${picked.length} source${picked.length === 1 ? "" : "s"} queued. The worker will start it within a few seconds.` };
}

export async function cancelSync(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("sync_runs").update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("id", String(fd.get("id"))).in("status", ["queued", "running"]);
  revalidatePath("/admin/sync");
}

// ───────── Staff (admins only) ─────────

export async function createStaff(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireStaff("admin");
  const email = text(fd, "email")?.toLowerCase();
  const full_name = text(fd, "full_name");
  const role = fd.get("role") === "admin" ? "admin" : "staff";
  if (!email || !full_name) return { error: "Name and email are required." };

  const password = text(fd, "password") ?? tempPassword();
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    app_metadata: { role },
  });
  if (error || !data.user) return { error: friendly(error?.message ?? "Could not create the account.") };
  // Set the role on the profile too: app_metadata isn't visible to the signup trigger yet
  await admin.from("profiles").update({ role, phone: text(fd, "phone") }).eq("id", data.user.id);

  revalidatePath("/admin/staff");
  return { ok: `${role === "admin" ? "Admin" : "Staff"} account created. Email: ${email} · Password: ${password}` };
}

export async function setStaffRole(fd: FormData) {
  const me = await requireStaff("admin");
  const id = String(fd.get("id"));
  const role = String(fd.get("role"));
  // Don't let an admin demote themselves out of the staff list
  if (id === me.id || (role !== "staff" && role !== "admin")) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id).neq("role", "student");
  revalidatePath("/admin/staff");
}

export async function removeStaff(fd: FormData) {
  const me = await requireStaff("admin");
  const id = String(fd.get("id"));
  if (id === me.id) return;
  const { data: target } = await (await createClient()).from("profiles").select("role").eq("id", id).single();
  if (target?.role !== "staff" && target?.role !== "admin") return;
  await createAdminClient().auth.admin.deleteUser(id);
  revalidatePath("/admin/staff");
}
