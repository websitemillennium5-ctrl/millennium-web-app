"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { leadQueryHref, leadSources, leadStatuses, type LeadQuery, type LeadStatus } from "@/lib/leads";
import { PillSelect } from "@/components/portal/job-filters";

const sourceOptions = { "": "Anywhere", ...leadSources };

/** Compact toolbar: search and source filter, then a segmented status switch with counts. */
export function LeadFilters({ query, total, counts }: { query: LeadQuery; total: number; counts: Record<LeadStatus | "", number> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (changes: Partial<LeadQuery>) => startTransition(() => router.push(leadQueryHref(query, changes), { scroll: false }));
  const tabs = [{ value: "" as const, label: "All", dot: "" }, ...leadStatuses];
  const filtered = query.q || query.source;

  return (
    <section className={`mb-5 rounded-2xl border border-line bg-white p-2 transition ${pending ? "opacity-70" : ""}`}>
      {/* Search + source on one line */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          key={query.q}
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
          }}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-mist/70 pr-1 pl-3.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-ink/10"
        >
          {pending ? <Loader2 className="size-4 shrink-0 animate-spin text-muted" /> : <Search className="size-4 shrink-0 text-muted" />}
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Search name, phone, email or city…"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
          />
          {query.q && (
            <button type="button" onClick={() => go({ q: "" })} aria-label="Clear search" className="rounded-full p-1 text-muted hover:bg-white hover:text-ink">
              <X className="size-3.5" />
            </button>
          )}
        </form>
        <PillSelect label="From" value={query.source} options={sourceOptions} onChange={(source) => go({ source })} />
      </div>

      {/* Status: one segmented switch with counts */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="scrollbar-none flex max-w-full gap-0.5 overflow-x-auto rounded-xl bg-mist/70 p-1" role="tablist" aria-label="Status">
          {tabs.map((t) => {
            const active = query.status === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => go({ status: t.value })}
                className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] transition ${
                  active ? "bg-white font-semibold text-ink shadow-[0_1px_3px_rgba(24,24,27,0.12)]" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.dot && <span className={`size-2 rounded-full ${t.dot}`} />}
                {t.label}
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-[11px] leading-[18px] font-semibold tabular-nums ${
                    active ? "bg-ink text-white" : "bg-white/80 text-muted"
                  }`}
                >
                  {counts[t.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-1.5 text-[13px] text-muted">
          <span>
            <span className="font-semibold text-ink">{total.toLocaleString("en-IN")}</span> {total === 1 ? "lead" : "leads"}
            {filtered && " matching"}
          </span>
          {filtered && (
            <Link href={leadQueryHref(query, { q: "", source: "" })} scroll={false} className="font-medium text-ink-soft underline decoration-line underline-offset-4 hover:text-ink">
              Clear filters
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
