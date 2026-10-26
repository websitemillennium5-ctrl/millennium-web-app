import Image from "next/image";
import Link from "next/link";
import { Globe, LogOut, Phone } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Breadcrumbs, PortalNav } from "@/components/portal/nav";
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

export function PortalShell({ portal, profile, children }: { portal: "student" | "admin"; profile: Profile; children: React.ReactNode }) {
  const roleLabel = portal === "admin" ? (profile.role === "admin" ? "Admin" : "Staff") : "Student";
  const initials =
    profile.full_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="portal flex min-h-screen flex-1 flex-col bg-canvas lg:h-screen lg:max-h-screen lg:flex-none lg:flex-row lg:overflow-hidden">
      {/* Sidebar sits on the grey canvas; on mobile it collapses to a top bar with scrolling tabs */}
      <aside className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-xl lg:static lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:px-4 lg:py-5">
        <div className="flex items-center justify-between px-4 pt-3 lg:px-2 lg:pt-0">
          <Link href={`/${portal}`} className="block">
            <Image src="/images/logo.png" alt={site.name} width={900} height={174} priority className="h-7 w-auto lg:h-8" />
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
          </div>
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
