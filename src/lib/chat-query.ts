/** URL state of the admin Chats page: which tab, the search text and the open thread. */
export type ChatView = "" | "enquiry" | "left";
export type ChatQuery = { view: ChatView; q: string; chat: string };

export function parseChatQuery(params: Record<string, string | string[] | undefined>): ChatQuery {
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const view = get("view");
  return { view: view === "enquiry" || view === "left" ? view : "", q: get("q").trim().slice(0, 100), chat: get("chat") };
}

export function chatHref(query: ChatQuery, changes: Partial<ChatQuery> = {}) {
  const next = { ...query, ...changes };
  const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
  return `/admin/chats${params.size ? `?${params}` : ""}`;
}
