"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, ChevronRight, House, IndianRupee, LayoutDashboard, Megaphone, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";

const links = {
  student: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/fees", label: "Fees", icon: IndianRupee },
    { href: "/student/jobs", label: "Airline jobs", icon: Briefcase },
    { href: "/student/profile", label: "Profile", icon: UserRound },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
    { href: "/admin/sync", label: "Sync", icon: RefreshCw },
  ],
};

const adminOnly = [{ href: "/admin/staff", label: "Staff", icon: ShieldCheck }];

const isActive = (portal: string, href: string, pathname: string) => (href === `/${portal}` ? pathname === href : pathname.startsWith(href));

export function PortalNav({ portal, isAdmin }: { portal: "student" | "admin"; isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = portal === "admin" && isAdmin ? [...links.admin, ...adminOnly] : links[portal];

  return (
    <nav className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5" aria-label="Portal">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(portal, href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-sm transition lg:py-2 ${
              active
                ? "border-line bg-white font-medium text-ink shadow-[0_1px_2px_rgba(11,18,32,0.06)]"
                : "border-transparent text-ink-soft hover:bg-white/70 hover:text-ink"
            }`}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** "⌂ / Students / Details" trail at the top of the content panel. */
export function Breadcrumbs({ portal }: { portal: "student" | "admin" }) {
  const pathname = usePathname();
  const items = [...links[portal], ...adminOnly];
  const section = items.filter((i) => isActive(portal, i.href, pathname)).sort((a, b) => b.href.length - a.href.length)[0];
  const sub = section && pathname !== section.href ? (pathname.endsWith("/new") ? "New" : "Details") : null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
      <Link href={`/${portal}`} className="text-muted transition hover:text-ink" aria-label="Home">
        <House className="size-4" strokeWidth={1.75} />
      </Link>
      {section && (
        <>
          <span className="text-line">/</span>
          {sub ? (
            <Link href={section.href} className="truncate text-muted hover:text-ink">
              {section.label}
            </Link>
          ) : (
            <span className="truncate font-medium text-ink">{section.label}</span>
          )}
        </>
      )}
      {sub && (
        <>
          <ChevronRight className="size-3.5 text-muted" />
          <span className="truncate font-medium text-ink">{sub}</span>
        </>
      )}
    </nav>
  );
}
