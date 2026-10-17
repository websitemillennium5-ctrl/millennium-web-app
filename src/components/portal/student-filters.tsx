"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LayoutList, Loader2, Search, Table2, X } from "lucide-react";
import { courses } from "@/lib/site";
import { studentQueryHref, type StudentQuery } from "@/lib/student-query";
import { PillSelect } from "@/components/portal/job-filters";

const feeLabels = { "": "All", due: "Balance due", paid: "Fully paid" } as const;
const joinedLabels = { "": "Any time", "30": "Past 30 days", "180": "Past 6 months", "365": "Past year" } as const;
const sortLabels = { newest: "Newest", oldest: "Oldest", name: "Name A–Z", due: "Highest due" } as const;

export function StudentFilters({ query, total, batches }: { query: StudentQuery; total: number; batches: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (changes: Partial<StudentQuery>) => startTransition(() => router.push(studentQueryHref(query, changes), { scroll: false }));

  const batchOptions = Object.fromEntries([["", "All batches"], ...batches.map((b) => [b, b])]) as Record<string, string>;
  const courseOptions = Object.fromEntries([["", "All courses"], ...courses.map((c) => [c.slug, c.title])]) as Record<string, string>;
  const courseTitle = (slug: string) => courseOptions[slug] ?? slug;

  const active = [
    query.q && { key: "q", label: `“${query.q}”` },
    query.course && { key: "course", label: courseTitle(query.course) },
    query.batch && { key: "batch", label: query.batch },
    query.fees && { key: "fees", label: feeLabels[query.fees] },
    query.joined && { key: "joined", label: `Joined ${joinedLabels[query.joined].toLowerCase()}` },
  ].filter(Boolean) as { key: keyof StudentQuery; label: string }[];

  return (
    <section className={`mb-5 overflow-hidden rounded-2xl border border-line bg-white transition ${pending ? "opacity-70" : ""}`}>
      {/* Search */}
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
          placeholder="Search name, student ID, roll no, email or phone…"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
        />
        <button className="h-9 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-white transition hover:bg-ink-soft">Search</button>
      </form>

      {/* Dropdowns + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
        <PillSelect label="Course" value={query.course} options={courseOptions} onChange={(course) => go({ course })} />
        <PillSelect label="Batch" value={query.batch} options={batchOptions} onChange={(batch) => go({ batch })} />
        <PillSelect label="Fees" value={query.fees} options={feeLabels} onChange={(fees) => go({ fees })} />
        <PillSelect label="Joined" value={query.joined} options={joinedLabels} onChange={(joined) => go({ joined })} />
        <PillSelect label="Sort" value={query.sort} options={sortLabels} onChange={(sort) => go({ sort })} />
        </div>
        <div className="inline-flex rounded-full border border-line bg-mist p-0.5" role="group" aria-label="View">
          {(
            [
              ["cards", "Cards", LayoutList],
              ["table", "Table", Table2],
            ] as const
          ).map(([view, label, Icon]) => (
            <button
              key={view}
              type="button"
              onClick={() => go({ view, page: query.page })}
              aria-pressed={query.view === view}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition ${
                query.view === view ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgba(24,24,27,0.1)]" : "text-muted hover:text-ink"
              }`}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count + active filters */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5 text-sm">
        <span className="mr-1 text-muted">
          <span className="font-semibold text-ink">{total.toLocaleString("en-IN")}</span> {total === 1 ? "student" : "students"}
          {active.length > 0 && " matching"}
        </span>
        {active.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => go({ [f.key]: "" } as Partial<StudentQuery>)}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-mist py-0.5 pr-1.5 pl-2.5 text-xs text-ink-soft transition hover:border-ink/25 hover:text-ink"
          >
            {f.label}
            <X className="size-3" />
          </button>
        ))}
        {active.length > 0 && (
          <Link href={studentQueryHref({ ...query, q: "", course: "", batch: "", fees: "", joined: "" })} scroll={false} className="ml-auto text-xs font-medium text-muted hover:text-ink">
            Clear all
          </Link>
        )}
      </div>
    </section>
  );
}
