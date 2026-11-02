import { after } from "next/server";
import { requirePage } from "@/lib/auth";
import { parseChatQuery } from "@/lib/chat-query";
import { chatUnread } from "@/lib/chats";
import { getChatSession, getChatSummaries } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatInbox } from "@/components/portal/chat-sessions";
import { Empty, PageTitle } from "@/components/portal/ui";

/** Read once per request; the page always renders fresh. */
const requestTime = () => Date.now();

/** Records that staff opened this chat (only called after requirePage). */
async function markChatRead(id: string) {
  const { error } = await createAdminClient().from("chat_sessions").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) console.error("Marking chat read failed:", error.message);
}

export default async function AdminChats({ searchParams }: PageProps<"/admin/chats">) {
  const profile = await requirePage("chats");
  const query = parseChatQuery(await searchParams);
  const [all, selected] = await Promise.all([getChatSummaries(), query.chat ? getChatSession(query.chat) : null]);
  const now = requestTime();
  // Only a thread the staff member clicked counts as opened; it is marked read once the page has been sent
  if (selected && chatUnread(selected)) after(() => markChatRead(selected.id));

  const week = all.filter((s) => now - Date.parse(s.started_at) < 7 * 86_400_000).length;
  const enquired = all.filter((s) => s.lead_id).length;
  const rate = all.length ? enquired / all.length : null;

  return (
    <>
      <PageTitle
        title="Chats"
        text="Every conversation visitors have with the website chat, live. Take one over to reply yourself."
        action={
          <dl className="flex flex-wrap gap-1.5 text-xs">
            <Figure label={all.length === 1 ? "conversation" : "conversations"} value={all.length} hint={`${week} this week`} />
            <Figure label={enquired === 1 ? "enquiry" : "enquiries"} value={enquired} tone="good" />
            <Figure label="completed" value={rate === null ? "—" : `${Math.round(rate * 100)}%`} />
          </dl>
        }
      />
      {all.length === 0 ? (
        <Empty>No chats yet. Conversations appear here as soon as a visitor sends a message.</Empty>
      ) : (
        <ChatInbox initial={all} query={query} selected={selected} staffName={profile.full_name} />
      )}
    </>
  );
}

/** Compact "2 conversations · 2 this week" pill for the page header. */
function Figure({ label, value, hint, tone = "default" }: { label: string; value: number | string; hint?: string; tone?: "default" | "good" }) {
  return (
    <div className="flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 whitespace-nowrap">
      <dd className={`font-semibold tabular-nums ${tone === "good" ? "text-good" : "text-ink"}`}>{typeof value === "number" ? value.toLocaleString("en-IN") : value}</dd>
      <dt className="text-ink-soft">{label}</dt>
      {hint && <span className="text-muted">· {hint}</span>}
    </div>
  );
}
