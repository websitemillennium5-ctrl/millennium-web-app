import { requireStudent } from "@/lib/auth";
import { getEvents, searchJobs } from "@/lib/data";
import { eventMatchesSources, isIndianSource } from "@/lib/job-sources";
import { JOBS_PAGE_SIZE, jobQueryHref, parseJobQuery } from "@/lib/job-query";
import { EventList } from "@/components/portal/event-list";
import { JobFilters } from "@/components/portal/job-filters";
import { JobList } from "@/components/portal/job-list";
import { Pagination } from "@/components/portal/pagination";
import { ScrollReset } from "@/components/portal/scroll-reset";
import { PageTitle } from "@/components/portal/ui";

export default async function StudentJobs({ searchParams }: PageProps<"/student/jobs">) {
  await requireStudent();
  const query = parseJobQuery(await searchParams);
  const [{ jobs, total, pageCount }, allEvents] = await Promise.all([searchJobs(query), getEvents({ search: query.q })]);
  // Hiring events sit above the openings on the first page, narrowed by the same search and airline filters.
  const events = query.page === 1 ? allEvents.filter((e) => eventMatchesSources(e.source, query.source)) : [];
  events.sort((a, b) => Number(isIndianSource(b.source)) - Number(isIndianSource(a.source)));

  return (
    <>
      <ScrollReset key={query.page} />
      <PageTitle title="Airline jobs" text="Current openings plus walk-ins, open days and recruitment drives from airline career sites, refreshed daily." />
      <JobFilters basePath="/student/jobs" query={query} total={total} />
      {events.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-ink">Upcoming hiring events ({events.length})</h2>
          <EventList events={events} basePath="/student/jobs" />
        </section>
      )}
      <JobList jobs={jobs} basePath="/student/jobs" />
      <Pagination
        page={Math.min(query.page, pageCount)}
        pageCount={pageCount}
        total={total}
        pageSize={JOBS_PAGE_SIZE}
        href={(page) => jobQueryHref("/student/jobs", query, { page })}
      />
    </>
  );
}
