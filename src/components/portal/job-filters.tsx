"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createContext, useContext, useOptimistic, useRef, useTransition } from "react";
import { Check, ChevronDown, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { airlineBrand, roles, type RoleKey } from "@/lib/airlines";
import { jobQueryHref, type JobQuery } from "@/lib/job-query";
import { eventOnlySources, indianSources, jobSources, sourceLabel } from "@/lib/job-sources";
import { RoleIcon } from "@/components/portal/role-icon";
import { JobCardsSkeleton } from "@/components/portal/jobs-skeleton";

const allAirlines = [...Object.entries(jobSources), ...Object.entries(eventOnlySources)] as [string, string][];
const rank = (key: string) => (indianSources.includes(key) ? indianSources.indexOf(key) : indianSources.length);
// Indian airlines first (in indianSources order), then the rest as listed, then hand-added jobs.
const airlines = [...allAirlines.sort((a, b) => rank(a[0]) - rank(b[0])), ["manual", "Placement team"]] as [string, string][];

const postedLabels = {
  "": "Any time",
  "7": "Past week",
  "30": "Past month",
} as const;
const statusLabels = {
  "": "All listings",
  active: "Visible",
  hidden: "Hidden",
} as const;

export function PillSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <label
      className={`${className} relative inline-flex h-9 items-center rounded-full border border-line bg-white pr-8 pl-3.5 text-sm transition hover:border-ink/25 focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5`}
    >
      <span className="text-muted">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label}>
        {(Object.keys(options) as T[]).map((key) => (
          <option key={key} value={key}>
            {options[key]}
          </option>
        ))}
      </select>
      <span className="ml-1.5 font-medium text-ink">{options[value]}</span>
      <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-muted" />
    </label>
  );
}

/** Every filter back to its default ("Clear all"). */
const cleared: Partial<JobQuery> = { q: "", source: [], role: "", posted: "", sort: "newest", status: "" };

/** Applied filters as removable chips; each chip clears just its own filter (one per selected airline). */
function activeFilters(query: JobQuery) {
  return [
    query.q && { key: "q", label: `“${query.q}”`, clear: { q: "" } },
    query.role && { key: "role", label: roles[query.role].label, clear: { role: "" } },
    ...query.source.map((key) => ({ key: `source:${key}`, label: sourceLabel(key), clear: { source: query.source.filter((s) => s !== key) } })),
    query.posted && { key: "posted", label: postedLabels[query.posted], clear: { posted: "" } },
    query.status && { key: "status", label: statusLabels[query.status], clear: { status: "" } },
  ].filter(Boolean) as { key: string; label: string; clear: Partial<JobQuery> }[];
}

/**
 * Pushes the filters with `changes` applied to the URL. `pending` is true while the new page loads, and `query`
 * already reflects the change (optimistically) so the tapped tab / chip lights up straight away.
 */
function useJobNavState(basePath: string, serverQuery: JobQuery) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useOptimistic(serverQuery);
  const go = (changes: Partial<JobQuery>) =>
    startTransition(() => {
      setQuery({ ...query, page: 1, ...changes });
      router.push(jobQueryHref(basePath, query, changes), { scroll: false });
    });
  return [pending, go, query] as const;
}

const JobNavContext = createContext<ReturnType<typeof useJobNavState> | null>(null);

/** Shares one navigation state between the filters and <JobResults>, so a filter change anywhere shows the skeleton. */
export function JobNavProvider({ basePath, query, children }: { basePath: string; query: JobQuery; children: React.ReactNode }) {
  return <JobNavContext value={useJobNavState(basePath, query)}>{children}</JobNavContext>;
}

/** The provider's state when inside <JobNavProvider>, else a standalone one. */
function useJobNav(basePath: string, query: JobQuery) {
  const local = useJobNavState(basePath, query);
  return useContext(JobNavContext) ?? local;
}

/** The results (events, jobs, pagination); swapped for shimmering placeholder cards while a filter change loads. */
export function JobResults({ children }: { children: React.ReactNode }) {
  const pending = useContext(JobNavContext)?.[0];
  return pending ? <JobCardsSkeleton /> : children;
}

/**
 * "All airlines" plus one toggle chip per airline (multi-select; selected ones get a tick).
 * `compact`: on desktop the chips become a dense checklist (small logo, name, checkbox) for the sidebar.
 */
function AirlineChips({
  query,
  go,
  compact,
  fill,
}: {
  query: JobQuery;
  go: (changes: Partial<JobQuery>) => void;
  compact?: boolean;
  fill?: boolean;
}) {
  const width = fill ? "w-full min-w-0" : "";
  const all = query.source.length === 0;
  return (
    <>
      <button
        type="button"
        onClick={() => go({ source: [] })}
        aria-pressed={all}
        className={`${width} inline-flex h-10 shrink-0 items-center rounded-xl border px-3.5 text-sm transition ${
          all ? "border-ink bg-ink font-medium text-white" : "border-line bg-white text-ink-soft hover:border-ink/25"
        } ${compact ? "lg:h-8 lg:w-full lg:rounded-lg lg:px-2.5 lg:text-[12.5px]" : ""}`}
      >
        All airlines
      </button>
      {airlines.map(([key, label]) => {
        const brand = airlineBrand(key, label);
        const selected = query.source.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => go({ source: selected ? query.source.filter((s) => s !== key) : [...query.source, key] })}
            aria-pressed={selected}
            className={`${width} inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border bg-white py-1 pr-3.5 pl-1.5 text-sm transition ${
              selected ? "border-(--brand) font-medium text-ink ring-2 ring-(--brand-soft)" : "border-line text-ink-soft hover:border-ink/25"
            } ${compact ? `lg:h-8 lg:w-full lg:gap-2.5 lg:rounded-lg lg:border-transparent lg:py-0 lg:pr-2 lg:pl-1.5 lg:text-[12.5px] lg:ring-0 lg:hover:bg-mist ${selected ? "lg:bg-mist" : ""}` : ""}`}
            style={{ "--brand": brand.color, "--brand-soft": `color-mix(in srgb, ${brand.color} 20%, transparent)` } as React.CSSProperties}
          >
            {brand.logo ? (
              <span className={`flex h-7 w-10 shrink-0 items-center justify-center ${compact ? "lg:h-5 lg:w-8" : ""}`}>
                <Image src={brand.logo} alt="" width={40} height={28} className="max-h-full w-auto object-contain" />
              </span>
            ) : (
              <span
                className={`flex h-7 w-10 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${compact ? "lg:h-5 lg:w-8 lg:rounded lg:text-[9px]" : ""}`}
                style={{ background: brand.color }}
              >
                {brand.code}
              </span>
            )}
            <span className="truncate">{label}</span>
            {selected ? (
              <span
                className={`ml-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-(--brand) text-white ${compact ? "lg:rounded" : ""}`}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            ) : (
              compact && <span className="ml-auto hidden size-4 shrink-0 rounded border border-line bg-white lg:block" />
            )}
          </button>
        );
      })}
    </>
  );
}

const sidebarHeading = "mb-2 px-1 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase";

/**
 * Posted / sort / airline filters as a side column, for pages that pair it with `<JobFilters sidebar />`.
 * On phones the airlines become a horizontally scrolling row.
 */
export function JobFiltersSidebar({ basePath, query: serverQuery }: { basePath: string; query: JobQuery }) {
  const [pending, go, query] = useJobNav(basePath, serverQuery);
  return (
    <aside className={`rounded-2xl border border-line bg-white p-3 transition ${pending ? "opacity-70" : ""}`}>
      <p className={sidebarHeading}>Sort &amp; date</p>
      <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
        <PillSelect
          label="Posted"
          value={query.posted}
          options={postedLabels}
          onChange={(posted) => go({ posted })}
          className="lg:h-8 lg:w-full lg:text-[12.5px]"
        />
        <PillSelect
          label="Sort"
          value={query.sort}
          options={{ newest: "Newest", oldest: "Oldest" }}
          onChange={(sort) => go({ sort })}
          className="lg:h-8 lg:w-full lg:text-[12.5px]"
        />
      </div>
      <p className={`${sidebarHeading} mt-3.5`}>Airlines</p>
      <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        <AirlineChips query={query} go={go} compact />
      </div>
    </aside>
  );
}

/** Search, role tabs and the active-filter summary. Without `sidebar` it also holds posted / sort / airlines. */
export function JobFilters({
  basePath,
  query: serverQuery,
  total,
  staff,
  sidebar,
}: {
  basePath: string;
  query: JobQuery;
  total: number;
  staff?: boolean;
  sidebar?: boolean;
}) {
  const [pending, go, query] = useJobNav(basePath, serverQuery);

  const active = activeFilters(query);

  const roleTab = (key: RoleKey | "", label: string, iconClass = "text-muted") => {
    const selected = query.role === key;
    return (
      <button
        key={key || "all"}
        type="button"
        onClick={() => go({ role: key })}
        aria-pressed={selected}
        className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm transition ${
          selected ? "border-ink bg-ink font-medium text-white" : "border-line bg-white text-ink-soft hover:border-ink/25 hover:text-ink"
        }`}
      >
        <RoleIcon role={key} className={`size-4 ${selected ? "text-white" : iconClass}`} />
        {label}
      </button>
    );
  };

  const searchForm = (className: string) => (
    <form
      key={query.q}
      onSubmit={(e) => {
        e.preventDefault();
        go({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
      }}
      className={`flex items-center gap-2 p-2 pl-4 ${className}`}
    >
      {pending ? <Loader2 className="size-4 shrink-0 animate-spin text-muted" /> : <Search className="size-4 shrink-0 text-muted" />}
      <input
        name="q"
        defaultValue={query.q}
        placeholder="Search by role, city or airline…"
        className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
      />
      <button className="h-9 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-white transition hover:bg-ink-soft">Search</button>
    </form>
  );

  const roleTabs = [
    roleTab("", "All roles"),
    ...(Object.keys(roles) as RoleKey[]).map((key) => roleTab(key, roles[key].label, roles[key].iconClass)),
  ];

  const count = (
    <span className="text-muted">
      <span className="font-semibold text-ink">{total.toLocaleString("en-IN")}</span> {total === 1 ? "job" : "jobs"}
      {active.length > 0 && " matching"}
    </span>
  );
  const chips = active.map((f) => (
    <button
      key={f.key}
      type="button"
      onClick={() => go(f.clear)}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-mist py-0.5 pr-1.5 pl-2.5 text-xs text-ink-soft transition hover:border-ink/25 hover:text-ink"
    >
      {f.label}
      <X className="size-3" />
    </button>
  ));
  const clearAll = active.length > 0 && (
    <button type="button" onClick={() => go(cleared)} className="text-xs font-medium text-muted hover:text-ink">
      Clear all
    </button>
  );

  // Sidebar pages: a free-standing, centred search + role bar (the rest lives in JobFiltersSidebar)
  if (sidebar) {
    return (
      <section className={`mx-auto mb-8 flex max-w-2xl flex-col items-center gap-4 transition ${pending ? "opacity-70" : ""}`}>
        {searchForm(
          "w-full rounded-full border border-line bg-white shadow-[0_8px_24px_-16px_rgba(24,24,27,0.25)] focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5",
        )}
        <div className="scrollbar-none -mx-4 flex max-w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 sm:flex-wrap sm:justify-center">
          {roleTabs}
        </div>
      </section>
    );
  }

  return (
    <section className={`mb-5 overflow-hidden rounded-2xl border border-line bg-white transition ${pending ? "opacity-70" : ""}`}>
      {searchForm("border-b border-line")}

      {/* Role tabs + dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">{roleTabs}</div>
        <div className="flex flex-wrap gap-1.5">
          <PillSelect label="Posted" value={query.posted} options={postedLabels} onChange={(posted) => go({ posted })} />
          <PillSelect label="Sort" value={query.sort} options={{ newest: "Newest", oldest: "Oldest" }} onChange={(sort) => go({ sort })} />
          {staff && <PillSelect label="Show" value={query.status} options={statusLabels} onChange={(status) => go({ status })} />}
        </div>
      </div>

      {/* Airlines */}
      <div className="border-t border-line bg-mist/50 px-3 py-3">
        <p className="mb-2 px-1 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">Airlines</p>
        <div className="scrollbar-none fade-right -mx-3 flex gap-2 overflow-x-auto px-3 pr-12">
          <AirlineChips query={query} go={go} />
        </div>
      </div>

      {/* Result count + active filters */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5 text-sm">
        <span className="mr-1">{count}</span>
        {chips}
        {clearAll && <span className="ml-auto">{clearAll}</span>}
      </div>
    </section>
  );
}

/**
 * Sidebar pages: job + hiring-event counts with the active-filter chips, shown above the results.
 * (Without `sidebar`, JobFilters shows the count inside its own panel.)
 */
export function JobResultsBar({ basePath, query: serverQuery, total, eventCount }: { basePath: string; query: JobQuery; total: number; eventCount: number }) {
  const [pending, go, query] = useJobNav(basePath, serverQuery);
  const active = activeFilters(query);
  return (
    <div className={`mb-5 flex flex-col gap-3 transition sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 ${pending ? "opacity-70" : ""}`}>
      <p className="text-base text-muted">
        <span className="text-lg font-semibold text-ink">{total.toLocaleString("en-IN")}</span> {total === 1 ? "job" : "jobs"}
        {eventCount > 0 && (
          <>
            <span className="px-2 text-line">|</span>
            <span className="text-lg font-semibold text-ink">{eventCount}</span> upcoming hiring {eventCount === 1 ? "event" : "events"}
          </>
        )}
      </p>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {active.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => go(f.clear)}
              aria-label={`Remove filter: ${f.label}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white pr-2 pl-3.5 text-sm font-medium text-ink shadow-sm transition hover:border-ink/30 active:scale-95"
            >
              {f.label}
              <span className="flex size-5 items-center justify-center rounded-full bg-mist text-muted">
                <X className="size-3.5" />
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(cleared)}
            className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-ink-soft underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Phones (sidebar pages): a floating "Filters" button, bottom right, that opens the sort / date / airline
 * filters in a bottom sheet. Filters apply as they're tapped; "Show results" just closes the sheet.
 */
export function JobFiltersSheet({
  basePath,
  query: serverQuery,
  total,
  eventCount = 0,
}: {
  basePath: string;
  query: JobQuery;
  total: number;
  eventCount?: number;
}) {
  const [pending, go, query] = useJobNav(basePath, serverQuery);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  const applied = query.source.length + (query.posted ? 1 : 0) + (query.sort !== "newest" ? 1 : 0);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="fixed right-[calc((var(--frame-gutter,0px)+1.25rem)/var(--frame-zoom,1))] bottom-[calc((var(--dock-space,0rem)+0.5rem)/var(--frame-zoom,1))] z-[70] flex h-12 items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-sm font-medium text-white shadow-lg shadow-black/25 transition active:scale-95 lg:hidden"
      >
        <SlidersHorizontal className="size-4" />
        Filters
        {applied > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-ink">{applied}</span>
        )}
      </button>

      <dialog
        ref={dialog}
        data-lenis-prevent
        onClick={(e) => e.target === dialog.current && close()}
        className="portal mx-auto mt-auto mb-0 max-h-[calc(85dvh/var(--frame-zoom,1))] w-full max-w-[calc(var(--frame-width,100vw)/var(--frame-zoom,1))] rounded-t-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/30 lg:hidden"
      >
        <div className="flex max-h-[calc(85dvh/var(--frame-zoom,1))] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="text-base font-semibold">Filters</p>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-full p-1.5 text-muted transition hover:bg-mist hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto overscroll-contain px-5 py-4 transition ${pending ? "opacity-70" : ""}`}>
            <p className={sidebarHeading}>Sort &amp; date</p>
            <div className="grid grid-cols-2 gap-2">
              <PillSelect label="Posted" value={query.posted} options={postedLabels} onChange={(posted) => go({ posted })} className="w-full" />
              <PillSelect
                label="Sort"
                value={query.sort}
                options={{ newest: "Newest", oldest: "Oldest" }}
                onChange={(sort) => go({ sort })}
                className="w-full"
              />
            </div>
            <p className={`${sidebarHeading} mt-5`}>Airlines</p>
            <div className="grid grid-cols-2 gap-2">
              <AirlineChips query={query} go={go} fill />
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {applied > 0 && (
              <button
                type="button"
                onClick={() => go({ source: [], posted: "", sort: "newest" })}
                className="text-sm font-medium text-muted hover:text-ink"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="ml-auto inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-white"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Show {(total + eventCount).toLocaleString("en-IN")}{" "}
              {eventCount > 0 ? (total + eventCount === 1 ? "result" : "results") : total === 1 ? "job" : "jobs"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
