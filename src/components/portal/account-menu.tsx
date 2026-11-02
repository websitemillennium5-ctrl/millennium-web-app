"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";

/** Staff sidebar avatar: tapping it opens a small account menu with the signed-in user and Sign out. */
export function AccountMenu({ portal, name, email, role }: { portal: "student" | "admin"; name: string; email: string | null; role: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex size-9 items-center justify-center rounded-full bg-accent text-white transition hover:brightness-110 active:scale-95"
      >
        <UserRound className="size-4.5" strokeWidth={1.75} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-40 mb-2 w-60 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_16px_40px_-16px_rgba(24,24,27,0.35)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
            {email && <p className="truncate text-xs text-muted">{email}</p>}
            <p className="mt-1 text-[11px] font-medium tracking-wide text-muted uppercase">{role}</p>
          </div>
          <form action={signOut}>
            <input type="hidden" name="portal" value={portal} />
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-medium text-ink transition hover:bg-mist"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
