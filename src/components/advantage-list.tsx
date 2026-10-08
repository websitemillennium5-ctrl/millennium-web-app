"use client";

import { useEffect, useRef, useState } from "react";
import { Award, BadgeIndianRupee, Plane, ShieldCheck, Sparkles, Users } from "lucide-react";
import { advantages } from "@/lib/site";

const icons = [Award, Users, Plane, Sparkles, BadgeIndianRupee, ShieldCheck];

/** Numbered advantage rows; the row nearest the middle of the viewport lights up as you scroll */
export function AdvantageList() {
  const [active, setActive] = useState(0);
  const rows = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      // a thin band across the middle of the screen
      { rootMargin: "-45% 0px -45% 0px" },
    );
    rows.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <ol className="border-t border-white/10">
      {advantages.map((a, i) => {
        const Icon = icons[i];
        const on = i === active;
        return (
          <li
            key={a.title}
            ref={(el) => {
              rows.current[i] = el;
            }}
            data-index={i}
            onMouseEnter={() => setActive(i)}
            className="group relative border-b border-white/10 py-8 lg:py-10"
          >
            {/* red accent rail */}
            <span
              className={`absolute top-0 left-0 h-px bg-brand transition-all duration-700 ease-out ${on ? "w-full" : "w-0"}`}
            />
            <div
              className={`grid grid-cols-[3rem_1fr_auto] items-start gap-4 transition-opacity duration-500 sm:grid-cols-[4rem_1fr_auto] ${
                on ? "opacity-100" : "opacity-40"
              }`}
            >
              <span className={`pt-1.5 font-mono text-sm transition-colors ${on ? "text-brand" : "text-white/60"}`}>
                0{i + 1}
              </span>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{a.title}</h3>
                <div
                  className={`grid transition-all duration-500 ease-out ${
                    on ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <p className="max-w-lg overflow-hidden leading-relaxed text-white/60">{a.text}</p>
                </div>
              </div>
              <span
                className={`flex size-12 items-center justify-center rounded-full transition-all duration-500 ${
                  on ? "rotate-0 bg-brand text-white" : "-rotate-12 bg-white/5 text-white/60"
                }`}
              >
                <Icon className="size-5" />
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
