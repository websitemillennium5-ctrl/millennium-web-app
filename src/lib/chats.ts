export type ChatMode = "bot" | "staff" | "ended";
export type ChatSender = "bot" | "visitor" | "staff" | "system";
export type ChatMessage = { id: number; sender: ChatSender; text: string; staff_name: string | null; created_at: string };

/** Unread until staff open it, and again if the visitor keeps chatting after that. */
export const chatUnread = (s: { read_at: string | null; updated_at: string }) => !s.read_at || Date.parse(s.updated_at) > Date.parse(s.read_at);

/** The visitor's browser polls every few seconds while the chat window is open, so a recent poll means they're still there. */
export const ONLINE_WINDOW_MS = 20_000;
export const visitorOnline = (s: { visitor_seen_at: string; mode: ChatMode }, now: number) => s.mode !== "ended" && now - Date.parse(s.visitor_seen_at) < ONLINE_WINDOW_MS;

export const firstName = (name: string) => name.trim().split(/\s+/)[0];
