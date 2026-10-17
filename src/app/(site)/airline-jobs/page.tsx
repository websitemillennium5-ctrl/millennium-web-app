import type { Metadata } from "next";
import { getEvents, searchJobs } from "@/lib/data";
import { eventMatchesSources, isIndianSource } from "@/lib/job-sources";
import { JOBS_PAGE_SIZE, jobQueryHref, parseJobQuery } from "@/lib/job-query";
import { CtaBand } from "@/components/ui";
import { EventList } from "@/components/portal/event-list";
import { JobFilters, JobFiltersSheet, JobFiltersSidebar, JobResultsBar } from "@/components/portal/job-filters";
import { JobList } from "@/components/portal/job-list";
import { Pagination } from "@/components/portal/pagination";
import { ScrollReset } from "@/components/portal/scroll-reset";

export const metadata: Metadata = {
  title: "Airline Jobs",
  description:
    "Free, up-to-date cabin crew, ground staff and airport job openings plus walk-in interviews from IndiGo, Air India, Akasa Air, Emirates, Qatar Airways, Etihad and more.",
};

// Public version of the student jobs page: same listings (active ones only, via the anon RLS policy), no login.
export default async function AirlineJobsPage({ searchParams }: PageProps<"/airline-jobs">) {
  const query = parseJobQuery(await searchParams);
  const [{ jobs, total, pageCount }, allEvents] = await Promise.all([searchJobs(query), getEvents({ search: query.q })]);
  const events = query.page === 1 ? allEvents.filter((e) => eventMatchesSources(e.source, query.source)) : [];
  events.sort((a, b) => Number(isIndianSource(b.source)) - Number(isIndianSource(a.source)));

  return (
    <>
      <section className="portal container-x pt-28 pb-12 lg:pt-36 lg:pb-16">
        <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Find your next job, free and updated daily</h1>
        <ScrollReset key={query.page} />
        <JobFilters basePath="/airline-jobs" query={query} total={total} sidebar />
        <JobFiltersSheet basePath="/airline-jobs" query={query} total={total} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
          {/* data-lenis-prevent: let the wheel scroll this column instead of the site-wide smooth scroll */}
          <div data-lenis-prevent className="scrollbar-none hidden min-w-0 lg:sticky lg:block lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:overscroll-contain">
            <JobFiltersSidebar basePath="/airline-jobs" query={query} />
          </div>
          <div className="min-w-0">
            <JobResultsBar basePath="/airline-jobs" query={query} total={total} eventCount={events.length} />
            {events.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-ink">Upcoming hiring events</h2>
                <EventList events={events} basePath="/airline-jobs" gated />
              </section>
            )}
            <JobList jobs={jobs} basePath="/airline-jobs" gated />
            <Pagination
              page={Math.min(query.page, pageCount)}
              pageCount={pageCount}
              total={total}
              pageSize={JOBS_PAGE_SIZE}
              href={(page) => jobQueryHref("/airline-jobs", query, { page })}
            />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
