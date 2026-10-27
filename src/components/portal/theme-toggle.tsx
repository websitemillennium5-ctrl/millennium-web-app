"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Light/dark switch for the staff portal. Remembered in a cookie so the server renders the right theme on load. */
export function ThemeToggle({ initialDark }: { initialDark: boolean }) {
  const [dark, setDark] = useState(initialDark);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.querySelector("[data-admin-shell]")?.classList.toggle("admin-dark", next);
    document.cookie = `admin-theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="relative flex h-8 w-14 shrink-0 items-center rounded-full border border-line bg-mist p-0.5 transition"
    >
      <Sun className={`absolute left-2 size-3.5 transition ${dark ? "text-muted" : "opacity-0"}`} />
      <Moon className={`absolute right-2 size-3.5 transition ${dark ? "opacity-0" : "text-muted"}`} />
      <span
        className={`relative z-10 flex size-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${dark ? "translate-x-6" : ""}`}
      >
        {dark ? <Moon className="size-3.5 text-amber-300" /> : <Sun className="size-3.5 text-amber-500" />}
      </span>
    </button>
  );
}
