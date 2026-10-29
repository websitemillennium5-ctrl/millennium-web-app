"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Briefcase, Cake, ChevronRight, House, IndianRupee, Inbox, LayoutDashboard, Megaphone, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";

const links = {
  student: [
    { href: "/student", label: "Dashboard", short: "Home", icon: LayoutDashboard },
    { href: "/student/announcements", label: "Announcements", short: "Notices", icon: Megaphone },
    { href: "/student/study", label: "Study material", short: "Study", icon: BookOpen },
    { href: "/student/fees", label: "Fees", icon: IndianRupee },
    { href: "/student/jobs", label: "Airline jobs", short: "Jobs", icon: Briefcase },
    { href: "/student/profile", label: "Profile", icon: UserRound },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/birthdays", label: "Birthdays", icon: Cake },
    { href: "/admin/leads", label: "Leads", icon: Inbox },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/study", label: "Study material", icon: BookOpen },
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

/** Student portal's app-style navigation: a floating tab bar pinned to the bottom of the screen. */
export function StudentDock() {
  const pathname = usePathname();
  // Fees is opened from the Profile page, so it has no tab of its own and keeps Profile highlighted
  const items = links.student.filter((l) => l.href !== "/student/fees");
  const path = pathname.startsWith("/student/fees") ? "/student/profile" : pathname;
  // most specific match, so /student/profile highlights Profile rather than the dashboard
  const current = items.reduce((best, item, i) => (isActive("student", item.href, path) && (best < 0 || item.href.length > items[best].href.length) ? i : best), -1);

  return (
    <nav
      aria-label="Portal"
      className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto w-[calc(100%-1.5rem)] max-w-[24rem] rounded-full border border-white/70 bg-white/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_2px_rgba(11,18,32,0.05),0_12px_32px_-12px_rgba(11,18,32,0.28)] ring-1 ring-ink/[0.05] backdrop-blur-2xl backdrop-saturate-[1.8]"
    >
      <div className="relative grid grid-cols-5">
        {/* Sliding pill behind the current tab */}
        {current >= 0 && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/5 p-0.5 transition-transform duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
            style={{ transform: `translateX(${current * 100}%)` }}
          >
            <span className="block size-full rounded-full bg-gradient-to-b from-[#c42d39] to-[#a2202b] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_18px_-8px_rgba(167,34,45,0.75)]" />
          </span>
        )}
        {items.map(({ href, label, short, icon: Icon }, i) => {
          const active = i === current;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex flex-col items-center gap-1 rounded-full py-2.5 outline-none transition-[color,transform] duration-300 focus-visible:ring-2 focus-visible:ring-[#a7222d]/40 active:scale-[0.94] ${
                active ? "text-white" : "text-ink-soft/75 hover:text-ink"
              }`}
            >
              <Icon className="size-[1.3rem] transition-transform duration-300 group-hover:-translate-y-px" strokeWidth={active ? 2.1 : 1.75} />
              <span className={`text-[11px] leading-none tracking-[0.01em] ${active ? "font-semibold" : "font-medium"}`}>{short ?? label}</span>
            </Link>
          );
        })}
      </div>
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
