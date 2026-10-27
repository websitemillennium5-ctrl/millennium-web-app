import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Globe, LogOut, Phone } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Breadcrumbs, PortalNav, StudentDock } from "@/components/portal/nav";
import { ThemeToggle } from "@/components/portal/theme-toggle";
import type { Profile } from "@/lib/auth";
import { site, telHref } from "@/lib/site";

function IconButton({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-mist hover:text-ink"
    >
      {children}
    </a>
  );
}

function SignOutButton({ portal, className = "" }: { portal: string; className?: string }) {
  return (
    <form action={signOut}>
      <input type="hidden" name="portal" value={portal} />
      <button aria-label="Sign out" title="Sign out" className={`flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-mist hover:text-ink ${className}`}>
        <LogOut className="size-4" strokeWidth={1.75} />
      </button>
    </form>
  );
}

export async function PortalShell({ portal, profile, children }: { portal: "student" | "admin"; profile: Profile; children: React.ReactNode }) {
  const roleLabel = portal === "admin" ? (profile.role === "admin" ? "Admin" : "Staff") : "Student";
  const initials =
    profile.full_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  if (portal === "student") {
    return (
      // .app-frame: a phone-width column on every screen, with the screen breakpoints switched off inside (see globals.css).
      // --dock-space: room kept clear under the content (and other floating buttons) for the dock;
      // --frame-gutter / --frame-width: the empty space either side of the column and its width, so fixed buttons and
      // sheets can line up with it; --frame-zoom: the content scale, which they divide back out of their screen positions.
      <div className="app-frame portal flex min-h-screen flex-1 flex-col bg-[#e7e7ea] [--dock-space:6.5rem] [--frame-gutter:max(0px,calc(50vw-14rem))] [--frame-width:min(100vw,28rem)] [--frame-zoom:1.12]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-x-clip bg-canvas bg-[radial-gradient(120%_22rem_at_50%_0%,rgba(59,130,246,0.10),transparent)] bg-no-repeat [--color-canvas:#eef3fb] shadow-[0_0_0_1px_var(--color-line),0_0_60px_-20px_rgba(24,24,27,0.25)]">
          <header className="sticky top-0 z-40 bg-canvas/75 shadow-[0_1px_0_rgba(11,18,32,0.05),0_8px_24px_-18px_rgba(11,18,32,0.35)] backdrop-blur-2xl backdrop-saturate-[1.6]">
            <div className="flex h-16 items-center justify-between gap-3 px-4">
              <Link href="/student" className="block transition active:scale-[0.97]">
                <Image src="/images/logo.png" alt={site.name} width={900} height={174} priority className="h-7 w-auto" />
              </Link>
              <div className="flex items-center gap-2">
                {/* Quick actions grouped in one glass capsule, matching the dock */}
                <div className="flex items-center rounded-full border border-white/80 bg-white/70 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(11,18,32,0.06)] ring-1 ring-ink/[0.05]">
                  <IconButton href={telHref(site.phones[0])} label={`Call front office ${site.phones[0]}`}>
                    <Phone className="size-4" strokeWidth={1.75} />
                  </IconButton>
                  <IconButton href="/" label="Visit website">
                    <Globe className="size-4" strokeWidth={1.75} />
                  </IconButton>
                  <span aria-hidden className="mx-0.5 h-4 w-px bg-line" />
                  <SignOutButton portal={portal} className="hover:bg-[#a7222d]/[0.08]! hover:text-[#a7222d]!" />
                </div>
                <Link
                  href="/student/profile"
                  aria-label="Your profile"
                  title={profile.full_name || profile.email || undefined}
                  className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-[#c42d39] to-[#a2202b] text-[13px] font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_14px_-6px_rgba(167,34,45,0.7)] ring-[3px] ring-white transition hover:brightness-110 active:scale-95"
                >
                  {initials}
                </Link>
              </div>
            </div>
          </header>
          {/* The portal's type scale is compact for the staff desk; on a phone-sized screen students need it ~12% larger.
              zoom scales every size at once, including the fixed text-[..px] ones shared with the staff portal. */}
          <main className="flex-1 px-4 pt-5 pb-[var(--dock-space)] [zoom:var(--frame-zoom)]">{children}</main>
        </div>
        <StudentDock />
      </div>
    );
  }

  // staff portal only: dark mode chosen with the header switch, remembered in a cookie
  const dark = (await cookies()).get("admin-theme")?.value === "dark";

  return (
    <div
      data-admin-shell
      className={`portal flex min-h-screen flex-1 flex-col bg-canvas text-ink lg:h-screen ${dark ? "admin-dark" : ""} lg:max-h-screen lg:flex-none lg:flex-row lg:overflow-hidden`}
    >
      {/* Sidebar sits on the grey canvas; on mobile it collapses to a top bar with scrolling tabs */}
      <aside className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-xl lg:static lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:px-4 lg:py-5">
        <div className="flex items-center justify-between px-4 pt-3 lg:px-2 lg:pt-0">
          <Link href={`/${portal}`} className="block">
            <Image src="/images/logo.png" alt={site.name} width={900} height={174} priority className="h-7 w-auto admin-dark:hidden lg:h-8" />
            <Image src="/images/logo-light.png" alt={site.name} width={900} height={174} className="hidden h-7 w-auto admin-dark:block lg:h-8" />
          </Link>
          <div className="lg:hidden">
            <SignOutButton portal={portal} />
          </div>
        </div>

        <div className="px-3 py-3 lg:mt-7 lg:flex-1 lg:px-0 lg:py-0">
          <PortalNav portal={portal} isAdmin={profile.role === "admin"} />
        </div>

        <div className="hidden lg:block">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-medium text-white transition hover:bg-ink-soft"
          >
            <Globe className="size-4" /> Visit website
          </Link>
          <div className="mt-4 flex items-center gap-3 border-t border-line px-2 pt-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-ink">{profile.full_name || profile.email}</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                <span className="size-1.5 rounded-full bg-good/100" />
                {roleLabel}
                {profile.roll_no && ` · ${profile.roll_no}`}
              </p>
            </div>
            <SignOutButton portal={portal} />
          </div>
        </div>
      </aside>

      {/* White content panel */}
      <div className="flex min-w-0 flex-1 flex-col bg-white lg:my-3 lg:min-h-0 lg:mr-3 lg:overflow-hidden lg:rounded-[1.25rem] lg:border lg:border-line">
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line px-4 sm:px-6">
          <Breadcrumbs portal={portal} />
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden items-center gap-2 rounded-full border border-line px-3 py-1 text-[12.5px] text-muted sm:flex">
              <span className="size-1.5 rounded-full bg-good" />
              <span className="font-medium text-ink">{roleLabel}</span> portal
            </span>
            <IconButton href={telHref(site.phones[0])} label={`Call front office ${site.phones[0]}`}>
              <Phone className="size-4" strokeWidth={1.75} />
            </IconButton>
            <IconButton href="/" label="Visit website">
              <Globe className="size-4" strokeWidth={1.75} />
            </IconButton>
            <span className="ml-1">
              <ThemeToggle initialDark={dark} />
            </span>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
