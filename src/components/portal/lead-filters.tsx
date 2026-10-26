"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { leadQueryHref, leadSources, leadStatuses, type LeadQuery, type LeadStatus } from "@/lib/leads";
import { PillSelect } from "@/components/portal/job-filters";

const sourceOptions = { "": "Anywhere", ...leadSources };

/** Search, status tabs with counts, and a source filter, in the same toolbar style as the student list. */
export function LeadFilters({ query, total, counts }: { query: LeadQuery; total: number; counts: Record<LeadStatus | "", number> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (changes: Partial<LeadQuery>) => startTransition(() => router.push(leadQueryHref(query, changes), { scroll: false }));
  const tabs = [{ value: "" as const, label: "All", dot: "" }, ...leadStatuses];
  const filtered = query.q || query.source;

  return (
    <section className={`mb-5 overflow-hidden rounded-2xl border border-line bg-white transition ${pending ? "opacity-70" : ""}`}>
      <form
        key={query.q}
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
        }}
        className="flex items-center gap-2 border-b border-line p-2 pl-4"
      >
        {pending ? <Loader2 className="size-4 shrink-0 animate-spin text-muted" /> : <Search className="size-4 shrink-0 text-muted" />}
        <input
          name="q"
          defaultValue={query.q}
          placeholder="Search name, phone, email or city…"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
        />
        <button className="h-9 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-white transition hover:bg-ink-soft">Search</button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div className="scrollbar-none -mx-3 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0" role="tablist" aria-label="Status">
          {tabs.map((t) => {
            const active = query.status === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => go({ status: t.value })}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition ${
                  active ? "bg-ink font-medium text-white" : "text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                {t.dot && <span className={`size-2 rounded-full ${t.dot}`} />}
                {t.label}
                <span className={`text-xs tabular-nums ${active ? "text-white/60" : "text-muted"}`}>{counts[t.value]}</span>
              </button>
            );
          })}
        </div>
        <PillSelect label="From" value={query.source} options={sourceOptions} onChange={(source) => go({ source })} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5 text-sm">
        <span className="mr-1 text-muted">
          <span className="font-semibold text-ink">{total.toLocaleString("en-IN")}</span> {total === 1 ? "lead" : "leads"}
          {filtered && " matching"}
        </span>
        {query.q && (
          <button type="button" onClick={() => go({ q: "" })} className="inline-flex items-center gap-1 rounded-full border border-line bg-mist py-0.5 pr-1.5 pl-2.5 text-xs text-ink-soft transition hover:border-ink/25 hover:text-ink">
            “{query.q}” <X className="size-3" />
          </button>
        )}
        {query.source && (
          <button type="button" onClick={() => go({ source: "" })} className="inline-flex items-center gap-1 rounded-full border border-line bg-mist py-0.5 pr-1.5 pl-2.5 text-xs text-ink-soft transition hover:border-ink/25 hover:text-ink">
            {leadSources[query.source]} <X className="size-3" />
          </button>
        )}
        {filtered && (
          <Link href={leadQueryHref(query, { q: "", source: "" })} scroll={false} className="ml-auto text-xs font-medium text-muted hover:text-ink">
            Clear all
          </Link>
        )}
      </div>
    </section>
  );
}
