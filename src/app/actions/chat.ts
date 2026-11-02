"use server";

import type { ChatMode } from "@/lib/chats";
import { createAdminClient } from "@/lib/supabase/admin";

/** What the visitor's browser sends: its own and the bot's bubbles, in order. */
export type OutgoingMessage = { from: "bot" | "you"; text: string; at: string };
export type ChatSync = { id: string; page: string; name: string; phone: string; leadId: string | null; messages: OutgoingMessage[] };
/** What comes back from the academy: a staff reply or a system note (joined, left, ended). */
export type IncomingMessage = { id: number; from: "staff" | "system"; text: string; by: string | null; at: string };
export type ChatPoll = { mode: ChatMode; by: string | null; messages: IncomingMessage[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (value: string, max: number) => value.trim().slice(0, max) || null;
const stamp = (at: string) => (Number.isNaN(Date.parse(at)) ? new Date().toISOString() : at);
/** A taken-over chat nobody at the academy has had open for this long goes back to the assistant. */
const STAFF_IDLE_MS = 90_000;

/**
 * Website chat: saves the bubbles added since the last call (and the visitor's details so far) so staff can read,
 * and join, the conversation in the admin portal. The browser keeps the session id and calls this after every bubble
 * once the visitor has said something.
 */
export async function postChatMessages(input: ChatSync): Promise<void> {
  if (!UUID.test(input.id) || !Array.isArray(input.messages)) return;
  const rows = input.messages
    .slice(0, 50)
    .filter((m) => (m.from === "bot" || m.from === "you") && typeof m.text === "string" && m.text.trim())
    .map((m) => ({ session_id: input.id, sender: m.from === "you" ? "visitor" : "bot", text: m.text.slice(0, 2000), created_at: stamp(m.at) }));
  if (!rows.length) return;

  const db = createAdminClient();
  const now = new Date().toISOString();
  const session = {
    id: input.id,
    page: clean(input.page, 200),
    name: clean(input.name, 120),
    phone: clean(input.phone, 20),
    lead_id: input.leadId && UUID.test(input.leadId) ? input.leadId : null,
    updated_at: now,
    visitor_seen_at: now,
  };
  const { error: sessionError } = await db.from("chat_sessions").upsert(session);
  if (sessionError) return console.error("Saving chat session failed:", sessionError.message);
  const { error } = await db.from("chat_messages").insert(rows);
  if (error) console.error("Saving chat messages failed:", error.message);
}

/**
 * Website chat: anything the academy has said since message `afterId`, plus whether a staff member has taken the
 * chat over. Also records that the visitor is still there. Called every few seconds while the chat is open.
 */
export async function pollChat(id: string, afterId: number): Promise<ChatPoll | null> {
  if (!UUID.test(id)) return null;
  const db = createAdminClient();
  const now = Date.now();
  const { data: session } = await db
    .from("chat_sessions")
    .update({ visitor_seen_at: new Date(now).toISOString() })
    .eq("id", id)
    .select("mode, taken_by_name, staff_seen_at")
    .maybeSingle();
  if (!session) return null;

  let mode = session.mode as ChatMode;
  let by = session.taken_by_name ?? null;
  // The staff member stopped watching (closed the portal, lost connection): hand back to the assistant
  if (mode === "staff" && (!session.staff_seen_at || now - Date.parse(session.staff_seen_at) > STAFF_IDLE_MS)) {
    const { data: released } = await db
      .from("chat_sessions")
      .update({ mode: "bot", taken_by: null, taken_by_name: null, taken_at: null, updated_at: new Date(now).toISOString() })
      .eq("id", id)
      .eq("mode", "staff")
      .select("id")
      .maybeSingle();
    if (released) {
      await db.from("chat_messages").insert({ session_id: id, sender: "system", text: `${by ?? "The executive"} left the chat. The assistant will continue.` });
      mode = "bot";
      by = null;
    }
  }

  const { data: rows } = await db
    .from("chat_messages")
    .select("id, sender, text, staff_name, created_at")
    .eq("session_id", id)
    .in("sender", ["staff", "system"])
    .gt("id", Number.isFinite(afterId) ? afterId : 0)
    .order("id");
  return {
    mode,
    by,
    messages: (rows ?? []).map((m) => ({ id: m.id, from: m.sender as "staff" | "system", text: m.text, by: m.staff_name, at: m.created_at })),
  };
}
