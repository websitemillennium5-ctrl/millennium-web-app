/** Follow-up stages staff set on a website lead from the admin Leads page. */
export const leadStatuses = [
  { value: "new", label: "New", dot: "bg-sky-500" },
  { value: "contacted", label: "Contacted", dot: "bg-amber-500" },
  { value: "converted", label: "Converted", dot: "bg-good" },
  { value: "not_interested", label: "Not interested", dot: "bg-muted/50" },
] as const;
export type LeadStatus = (typeof leadStatuses)[number]["value"];

export const leadSources = { "contact page": "Contact page", "course page": "Course page", "jobs page": "Jobs page" } as const;

export const experienceLabels: Record<string, string> = {
  none: "No prior experience",
  airline: "Airline / aviation",
  hospitality: "Hospitality",
  other: "Other experience",
};

export type LeadQuery = { q: string; status: LeadStatus | ""; source: keyof typeof leadSources | "" };

export function parseLeadQuery(params: Record<string, string | string[] | undefined>): LeadQuery {
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const status = get("status");
  const source = get("source");
  return {
    q: get("q").trim().slice(0, 100),
    status: leadStatuses.some((s) => s.value === status) ? (status as LeadStatus) : "",
    source: source in leadSources ? (source as keyof typeof leadSources) : "",
  };
}

export function leadQueryHref(query: LeadQuery, changes: Partial<LeadQuery> = {}) {
  const next = { ...query, ...changes };
  const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
  return `/admin/leads${params.size ? `?${params}` : ""}`;
}

/** A lead still marked "new" this long after it arrived needs a follow-up. */
export const FOLLOW_UP_AFTER_MS = 2 * 86_400_000;

export const needsFollowUp = (lead: { status: string; created_at: string }, now: number) =>
  lead.status === "new" && now - Date.parse(lead.created_at) > FOLLOW_UP_AFTER_MS;

/** Headline numbers for the Leads page, across every lead (not just the filtered view). */
export function leadStats(leads: { status: string; created_at: string }[], now: number) {
  const week = leads.filter((l) => now - Date.parse(l.created_at) < 7 * 86_400_000).length;
  const open = leads.filter((l) => l.status === "new");
  const converted = leads.filter((l) => l.status === "converted").length;
  const closed = converted + leads.filter((l) => l.status === "not_interested").length;
  return {
    total: leads.length,
    week,
    open: open.length,
    overdue: open.filter((l) => needsFollowUp(l, now)).length,
    converted,
    // Of the leads with an outcome, how many joined.
    rate: closed ? converted / closed : null,
  };
}

/** wa.me link for an Indian mobile number typed any way ("93104 28707", "+91 98765 43210", "09310428707"). */
export function whatsappHref(phone: string) {
  let digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 ? `https://wa.me/${digits}` : null;
}
