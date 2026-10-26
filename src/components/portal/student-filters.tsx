"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LayoutGrid, Loader2, Search, Table2, X } from "lucide-react";
import { courses } from "@/lib/site";
import { courseStyle } from "@/lib/course-style";
import { studentQueryHref, type StudentQuery } from "@/lib/student-query";
import { CourseIcon } from "@/components/portal/course-icon";
import { PillSelect } from "@/components/portal/job-filters";

const feeLabels = { "": "All", due: "Balance due", paid: "Fully paid" } as const;
const joinedLabels = { "": "Any time", "30": "Past 30 days", "180": "Past 6 months", "365": "Past year" } as const;
const sortLabels = { newest: "Newest", oldest: "Oldest", name: "Name A–Z", due: "Highest due" } as const;

export function StudentFilters({
  query,
  total,
  batches,
  courseCounts,
  allCount,
}: {
  query: StudentQuery;
  total: number;
  batches: string[];
  courseCounts: Record<string, number>;
  allCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (changes: Partial<StudentQuery>) => startTransition(() => router.push(studentQueryHref(query, changes), { scroll: false }));

  const batchOptions = Object.fromEntries([["", "All batches"], ...batches.map((b) => [b, b])]) as Record<string, string>;

  // Course has its own tabs, so it isn't repeated as a chip here.
  const active = [
    query.q && { key: "q", label: `“${query.q}”` },
    query.batch && { key: "batch", label: `Batch ${query.batch}` },
    query.fees && { key: "fees", label: feeLabels[query.fees] },
    query.joined && { key: "joined", label: `Joined ${joinedLabels[query.joined].toLowerCase()}` },
  ].filter(Boolean) as { key: keyof StudentQuery; label: string }[];

  const tabs = [{ slug: "", title: "All students", count: allCount }, ...courses.map((c) => ({ slug: c.slug, title: c.title, count: courseCounts[c.slug] ?? 0 }))];

  return (
    <section className={`mb-5 rounded-2xl border border-line bg-white transition ${pending ? "opacity-70" : ""}`}>
      {/* Course tabs */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line px-2 pt-2" role="tablist" aria-label="Course">
        {tabs.map((t) => {
          const selected = query.course === t.slug;
          return (
            <button
              key={t.slug || "all"}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => go({ course: t.slug })}
              className={`relative inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 pt-2 pb-3 text-sm transition ${
                selected ? "font-medium text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <CourseIcon course={t.slug} className={`size-4 ${t.slug ? courseStyle(t.slug).iconClass : ""}`} />
              {t.title}
              <span className={`rounded-full px-1.5 py-px text-[11px] tabular-nums ${selected ? "bg-ink text-white" : "bg-mist text-muted"}`}>{t.count}</span>
              {selected && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full" style={{ background: t.slug ? courseStyle(t.slug).color : "var(--color-ink)" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Search + dropdowns + view toggle */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <form
          key={query.q}
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
          }}
          className="relative flex h-9 min-w-[16rem] flex-1 items-center rounded-full border border-line bg-white pr-1 pl-3.5 transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5 hover:border-ink/25"
        >
          {pending ? <Loader2 className="size-4 shrink-0 animate-spin text-muted" /> : <Search className="size-4 shrink-0 text-muted" />}
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="Search name, ID, roll no, email or phone"
            aria-label="Search students"
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:hidden"
          />
          {query.q && (
            <button type="button" onClick={() => go({ q: "" })} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-ink" aria-label="Clear search">
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="mr-1.5 hidden rounded border border-line px-1.5 text-[10px] text-muted sm:inline">Enter</kbd>
        </form>
        <PillSelect label="Fees" value={query.fees} options={feeLabels} onChange={(fees) => go({ fees })} />
        {batches.length > 0 && <PillSelect label="Batch" value={query.batch} options={batchOptions} onChange={(batch) => go({ batch })} />}
        <PillSelect label="Joined" value={query.joined} options={joinedLabels} onChange={(joined) => go({ joined })} />
        <PillSelect label="Sort" value={query.sort} options={sortLabels} onChange={(sort) => go({ sort })} />
        <div className="inline-flex rounded-full border border-line bg-mist p-0.5" role="group" aria-label="View">
          {(
            [
              ["cards", "Cards", LayoutGrid],
              ["table", "Table", Table2],
            ] as const
          ).map(([view, label, Icon]) => (
            <button
              key={view}
              type="button"
              onClick={() => go({ view, page: query.page })}
              aria-pressed={query.view === view}
              title={`${label} view`}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition ${
                query.view === view ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgba(24,24,27,0.1)]" : "text-muted hover:text-ink"
              }`}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Result count + active filters */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-mist/40 px-4 py-2 text-sm rounded-b-2xl">
        <span className="mr-1 text-muted">
          Showing <span className="font-semibold text-ink">{total.toLocaleString("en-IN")}</span> {total === 1 ? "student" : "students"}
        </span>
        {active.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => go({ [f.key]: "" } as Partial<StudentQuery>)}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-0.5 pr-1.5 pl-2.5 text-xs text-ink-soft transition hover:border-ink/25 hover:text-ink"
          >
            {f.label}
            <X className="size-3" />
          </button>
        ))}
        {(active.length > 0 || query.course) && (
          <Link href={studentQueryHref({ ...query, q: "", course: "", batch: "", fees: "", joined: "" })} scroll={false} className="ml-auto text-xs font-medium text-muted hover:text-ink">
            Clear all
          </Link>
        )}
      </div>
    </section>
  );
}
