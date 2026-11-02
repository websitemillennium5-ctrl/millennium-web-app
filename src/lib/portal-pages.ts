import { BookOpen, Briefcase, Cake, History, Inbox, LayoutDashboard, Megaphone, MessagesSquare, RefreshCw, Users, type LucideIcon } from "lucide-react";

/**
 * The sections of the staff portal an admin can switch on or off per staff member (the Staff page itself is
 * admin-only and never listed). The keys are stored in profiles.portal_pages; the order is the sidebar order.
 */
export const portalPages = [
  { key: "overview", href: "/admin", label: "Overview", icon: LayoutDashboard },
  { key: "students", href: "/admin/students", label: "Students", icon: Users },
  { key: "birthdays", href: "/admin/birthdays", label: "Birthdays", icon: Cake },
  { key: "leads", href: "/admin/leads", label: "Leads", icon: Inbox },
  { key: "chats", href: "/admin/chats", label: "Chats", icon: MessagesSquare },
  { key: "announcements", href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { key: "study", href: "/admin/study", label: "Study material", icon: BookOpen },
  { key: "jobs", href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { key: "sync", href: "/admin/sync", label: "Sync", icon: RefreshCw },
  { key: "activity", href: "/admin/activity", label: "Activity", icon: History },
] as const satisfies readonly { key: string; href: string; label: string; icon: LucideIcon }[];

export type PortalPage = (typeof portalPages)[number]["key"];

export const pageKeys = portalPages.map((p) => p.key) as PortalPage[];

export const isPortalPage = (value: unknown): value is PortalPage => typeof value === "string" && (pageKeys as string[]).includes(value);

type Access = { role: string; portal_pages: string[] | null };

/** Pages this account may open, in sidebar order. Admins, and staff with no restriction set, get every page. */
export function allowedPages(profile: Access) {
  if (profile.role === "admin" || profile.portal_pages === null) return [...portalPages];
  const allowed = profile.portal_pages;
  return portalPages.filter((p) => allowed.includes(p.key));
}

export const canAccess = (profile: Access, page: PortalPage) => allowedPages(profile).some((p) => p.key === page);

/**
 * What to store for a chosen set of pages: null when every page is ticked, so the member also sees pages
 * added to the portal later; otherwise the valid keys in sidebar order.
 */
export function normalisePages(chosen: Iterable<unknown>): PortalPage[] | null {
  const set = new Set([...chosen].filter(isPortalPage));
  return set.size === pageKeys.length ? null : pageKeys.filter((k) => set.has(k));
}
