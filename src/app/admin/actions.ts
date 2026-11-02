"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import type { FormState } from "@/app/actions/auth";
import { ANNOUNCEMENT_IMAGE_BUCKET, ANNOUNCEMENT_IMAGE_MAX_BYTES, ANNOUNCEMENT_IMAGE_MAX_EDGE, ANNOUNCEMENT_IMAGE_TYPES } from "@/lib/announcements";
import { requireStaff } from "@/lib/auth";
import { ONLINE_WINDOW_MS, type ChatMessage, type ChatMode, type ChatSender } from "@/lib/chats";
import { getChatSummaries, type ChatSummary } from "@/lib/data";
import { leadStatuses } from "@/lib/leads";
import { eventTable, jobTable } from "@/lib/job-sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import { localOnlyScrapers } from "@/lib/sync";
import { STUDY_BUCKET, STUDY_MAX_BYTES } from "@/lib/study";
import { youtubeId } from "@/lib/video";

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
    date_of_birth: text(fd, "date_of_birth"),
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

export async function resetPassword(id: string): Promise<FormState & { password?: string }> {
  await requireStaff();
  // Staff may only reset student passwords; staff/admin accounts are managed by admins
  const { data: target } = await (await createClient()).from("profiles").select("role").eq("id", id).single();
  if (target?.role !== "student") return { error: "Only student passwords can be reset here." };

  const password = tempPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
  if (error) return { error: error.message };
  return { ok: `New password: ${password} — share it with the student.`, password };
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

const announcementImages = () => createAdminClient().storage.from(ANNOUNCEMENT_IMAGE_BUCKET);

/**
 * Step 1 of attaching a picture: a one-time signed upload URL under `incoming/`, so the browser sends the
 * original straight to storage (Vercel caps request bodies at 4.5 MB; phone photos are bigger).
 * createAnnouncement then compresses it and throws the original away.
 */
export async function prepareAnnouncementImage(fileName: string, size: number, type: string): Promise<{ path: string; token: string } | { error: string }> {
  await requireStaff();
  if (!ANNOUNCEMENT_IMAGE_TYPES.includes(type)) return { error: "Use a JPG, PNG, WebP or GIF picture." };
  if (size > ANNOUNCEMENT_IMAGE_MAX_BYTES) return { error: "That picture is over 15 MB. Pick a smaller one." };
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "img";
  const { data, error } = await announcementImages().createSignedUploadUrl(`incoming/${crypto.randomUUID()}.${ext}`);
  if (error || !data) return { error: error?.message ?? "Couldn't start the upload." };
  return { path: data.path, token: data.token };
}

/**
 * Shrinks a just-uploaded original to a web-sized WebP (longest edge ANNOUNCEMENT_IMAGE_MAX_EDGE, camera rotation
 * applied, EXIF such as GPS dropped), stores that under a permanent path and deletes the original either way.
 */
async function compressAnnouncementImage(incoming: string): Promise<{ path: string; width: number; height: number } | { error: string }> {
  if (!incoming.startsWith("incoming/")) return { error: "That upload isn't valid. Pick the picture again." };
  const bucket = announcementImages();
  try {
    const { data: blob, error } = await bucket.download(incoming);
    if (error || !blob) return { error: "The uploaded picture couldn't be found. Pick it again." };
    const { data, info } = await sharp(Buffer.from(await blob.arrayBuffer()))
      .rotate()
      .resize({ width: ANNOUNCEMENT_IMAGE_MAX_EDGE, height: ANNOUNCEMENT_IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.webp`;
    const { error: saveError } = await bucket.upload(path, data, { contentType: "image/webp", cacheControl: "31536000" });
    if (saveError) return { error: `Couldn't save the picture: ${saveError.message}` };
    return { path, width: info.width, height: info.height };
  } catch {
    return { error: "That picture couldn't be read. Try a JPG or PNG." };
  } finally {
    await bucket.remove([incoming]);
  }
}

export async function createAnnouncement(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const title = text(fd, "title");
  if (!title) return { error: "Add a title." };

  const video = text(fd, "video_url");
  if (video && !youtubeId(video)) return { error: "That doesn't look like a YouTube link. Paste the link from YouTube's Share button." };

  const incoming = text(fd, "image_path");
  const image = incoming ? await compressAnnouncementImage(incoming) : null;
  if (image && "error" in image) return { error: image.error };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    body: text(fd, "body") ?? "",
    course_slug: text(fd, "course_slug"),
    pinned: fd.get("pinned") === "on",
    image_path: image?.path ?? null,
    image_width: image?.width ?? null,
    image_height: image?.height ?? null,
    video_url: video,
    created_by: staff.id,
  });
  if (error) {
    // don't leave an orphaned picture behind
    if (image) await announcementImages().remove([image.path]);
    return { error: error.message };
  }

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
  const { data } = await supabase.from("announcements").delete().eq("id", String(fd.get("id"))).select("image_path").maybeSingle();
  if (data?.image_path) await announcementImages().remove([data.image_path]);
  revalidatePath("/admin/announcements");
}

// ───────── Study material ─────────

/**
 * Step 1 of an upload: a one-time signed upload URL for the private bucket, so the browser sends the file
 * straight to storage (Vercel caps request bodies at 4.5 MB, far below a typical PDF or video).
 */
export async function prepareStudyUpload(fileName: string, size: number): Promise<{ path: string; token: string } | { error: string }> {
  await requireStaff();
  if (size > STUDY_MAX_BYTES) return { error: "That file is over 50 MB. Upload a smaller copy, or share it as a link instead." };
  const safe = fileName.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(-80) || "file";
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}-${safe}`;
  const { data, error } = await createAdminClient().storage.from(STUDY_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "Couldn't start the upload." };
  return { path: data.path, token: data.token };
}

/** Step 2: save the material once its file (if any) is in storage. */
export async function createStudyMaterial(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const title = text(fd, "title");
  if (!title) return { error: "Add a title." };
  const filePath = text(fd, "file_path");
  const link = text(fd, "link_url");
  const video = text(fd, "video_url");
  if (!filePath && !link && !video) return { error: "Attach a file, add a link or paste a YouTube video." };
  if (link && !/^https?:\/\//i.test(link)) return { error: "Links must start with http:// or https://" };
  if (video && !youtubeId(video)) return { error: "That doesn't look like a YouTube link. Paste the link from YouTube's Share button." };

  const supabase = await createClient();
  const { error } = await supabase.from("study_materials").insert({
    title,
    description: text(fd, "description") ?? "",
    batch: text(fd, "batch"),
    file_path: filePath,
    file_name: text(fd, "file_name"),
    file_size: Number(fd.get("file_size")) || null,
    mime_type: text(fd, "mime_type"),
    link_url: link,
    video_url: video,
    created_by: staff.id,
  });
  if (error) {
    // don't leave an orphaned upload behind
    if (filePath) await createAdminClient().storage.from(STUDY_BUCKET).remove([filePath]);
    return { error: error.message };
  }

  revalidatePath("/admin/study");
  revalidatePath("/student/study");
  return { ok: "Study material shared." };
}

export async function deleteStudyMaterial(fd: FormData) {
  await requireStaff();
  const id = String(fd.get("id"));
  const supabase = await createClient();
  const { data } = await supabase.from("study_materials").delete().eq("id", id).select("file_path").maybeSingle();
  if (data?.file_path) await createAdminClient().storage.from(STUDY_BUCKET).remove([data.file_path]);
  revalidatePath("/admin/study");
  revalidatePath("/student/study");
}

// ───────── Leads ─────────

export async function updateLeadStatus(id: string, status: string) {
  await requireStaff();
  if (!leadStatuses.some((s) => s.value === status)) return;
  const supabase = await createClient();
  await supabase.from("leads").update({ status }).eq("id", id);
  revalidatePath("/admin/leads");
}

export async function deleteLead(fd: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", String(fd.get("id")));
  revalidatePath("/admin/leads");
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

/** Queues a sync of the sources only the local worker can reach (the rest sync daily on GitHub). */
export async function requestSync(): Promise<FormState> {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { count } = await supabase.from("sync_runs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]);
  if (count) return { error: "A sync is already queued or running." };

  const { error } = await supabase.from("sync_runs").insert({ sources: localOnlyScrapers, requested_by: staff.id });
  if (error) return { error: error.message };

  revalidatePath("/admin/sync");
  return { ok: "Sync queued. The worker will start it within a few seconds." };
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

// ───────── Website chat (live takeover) ─────────

export type ChatUpdate = { mode: ChatMode; takenByName: string | null; visitorSeenAt: string; messages: ChatMessage[] };

const chatText = (value: string) => value.trim().slice(0, 2000);

/** The conversation list, polled by the Chats page so new chats and replies show up without a reload. */
export async function listChats(): Promise<ChatSummary[]> {
  await requireStaff();
  return getChatSummaries();
}

/** Messages newer than `afterId` plus the session's current state. Polled by the open transcript; also marks it read. */
export async function getChatUpdates(id: string, afterId: number): Promise<ChatUpdate | null> {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: session }, { data: rows }] = await Promise.all([
    supabase.from("chat_sessions").update({ read_at: new Date().toISOString(), staff_seen_at: new Date().toISOString() }).eq("id", id).select("mode, taken_by_name, visitor_seen_at").maybeSingle(),
    supabase.from("chat_messages").select("id, sender, text, staff_name, created_at").eq("session_id", id).gt("id", afterId).order("id"),
  ]);
  if (!session) return null;
  return { mode: session.mode as ChatMode, takenByName: session.taken_by_name, visitorSeenAt: session.visitor_seen_at, messages: (rows ?? []) as ChatMessage[] };
}

async function systemNote(id: string, text: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase.from("chat_messages").insert({ session_id: id, sender: "system", text });
  await supabase.from("chat_sessions").update({ updated_at: now, read_at: now }).eq("id", id);
}

/** Switches the chat from the assistant to this staff member; the visitor sees them join. */
export async function takeOverChat(id: string) {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_sessions")
    .update({ mode: "staff", taken_by: profile.id, taken_by_name: profile.full_name, taken_at: new Date().toISOString(), staff_seen_at: new Date().toISOString() })
    .eq("id", id)
    .neq("mode", "ended")
    .select("id")
    .maybeSingle();
  if (data) await systemNote(id, `${profile.full_name} from ${site.shortName} joined the chat`);
  revalidatePath("/admin/chats");
}

/** Sends a reply to the visitor. Taking the chat over first if the assistant was still running it. */
/** Called by the admin panel while a reply is being typed (and once more, off, when the box empties). */
export async function setChatTyping(id: string, typing: boolean) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("chat_sessions").update({ staff_typing_at: typing ? new Date().toISOString() : null }).eq("id", id);
}

export async function replyToChat(id: string, text: string) {
  const profile = await requireStaff();
  const body = chatText(text);
  if (!body) return;
  const supabase = await createClient();
  const { data: session } = await supabase.from("chat_sessions").select("mode").eq("id", id).maybeSingle();
  if (!session || session.mode === "ended") return;
  if (session.mode !== "staff") await takeOverChat(id);
  const now = new Date().toISOString();
  await supabase.from("chat_messages").insert({ session_id: id, sender: "staff", text: body, staff_id: profile.id, staff_name: profile.full_name });
  await supabase.from("chat_sessions").update({ updated_at: now, read_at: now }).eq("id", id);
}

/** Hands the chat back to the assistant, or ends it for good. */
export async function releaseChat(id: string, how: "bot" | "ended") {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_sessions")
    .update(how === "bot" ? { mode: "bot", taken_by: null, taken_by_name: null, taken_at: null } : { mode: "ended" })
    .eq("id", id)
    .neq("mode", "ended")
    .select("id")
    .maybeSingle();
  if (data) await systemNote(id, how === "bot" ? `${profile.full_name} left the chat. The assistant will continue.` : `Chat ended by ${profile.full_name}`);
  revalidatePath("/admin/chats");
}

export type ChatAlert = {
  id: string;
  name: string | null;
  phone: string | null;
  page: string | null;
  mode: ChatMode;
  taken_by_name: string | null;
  started_at: string;
  visitor_seen_at: string;
  chat_messages: { sender: ChatSender; text: string }[];
};

/** A chat this staff member is handling, with the visitor's latest message (if they have sent any). */
export type TakenChat = { id: string; name: string | null; phone: string | null; chat_messages: { id: number; text: string }[] };

export type ChatAlertsResult = { waiting: ChatAlert[]; taken: TakenChat[] };

const CHAT_ID = /^[0-9a-f-]{36}$/i;

/**
 * For the portal-wide chat alert: live chats nobody has taken over yet (the assistant is still replying and the
 * visitor is online), plus the chats this staff member is handling, each with the visitor's newest message so the
 * portal can notify them of replies. `watching` are the chats they are already being alerted about: those come
 * back whatever their state, so the alert can clear itself once someone takes the chat or it ends.
 */
export async function chatAlerts(watching: string[]): Promise<ChatAlertsResult> {
  const profile = await requireStaff();
  const supabase = await createClient();
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const ids = watching.filter((id) => CHAT_ID.test(id)).slice(0, 20);
  const unattended = `and(mode.eq.bot,visitor_seen_at.gt.${since})`;
  const [{ data: waiting }, { data: taken }] = await Promise.all([
    supabase
      .from("chat_sessions")
      .select("id, name, phone, page, mode, taken_by_name, started_at, visitor_seen_at, chat_messages(sender, text)")
      .or(ids.length ? `${unattended},id.in.(${ids.join(",")})` : unattended)
      .order("started_at", { ascending: true })
      .order("id", { referencedTable: "chat_messages", ascending: false })
      .limit(3, { referencedTable: "chat_messages" })
      .limit(20),
    supabase
      .from("chat_sessions")
      .select("id, name, phone, chat_messages(id, text)")
      .eq("mode", "staff")
      .eq("taken_by", profile.id)
      .eq("chat_messages.sender", "visitor")
      .order("id", { referencedTable: "chat_messages", ascending: false })
      .limit(1, { referencedTable: "chat_messages" })
      .limit(20),
  ]);
  return { waiting: (waiting ?? []) as ChatAlert[], taken: (taken ?? []) as TakenChat[] };
}

/** Deletes a chat for good: the session row and, through the cascade, every message in it. Staff only (RLS). */
export async function deleteChat(id: string) {
  await requireStaff();
  if (!CHAT_ID.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
  if (error) throw new Error(`Deleting the chat failed: ${error.message}`);
  revalidatePath("/admin/chats");
}
