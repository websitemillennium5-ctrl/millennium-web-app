import { requireStaff } from "@/lib/auth";
import { getEvents, searchJobs } from "@/lib/data";
import { eventMatchesSources, isIndianSource } from "@/lib/job-sources";
import { JOBS_PAGE_SIZE, jobQueryHref, parseJobQuery } from "@/lib/job-query";
import { EventList } from "@/components/portal/event-list";
import { JobFilters } from "@/components/portal/job-filters";
import { JobList } from "@/components/portal/job-list";
import { ListingActions } from "@/components/portal/listing-actions";
import { Pagination } from "@/components/portal/pagination";
import { ScrollReset } from "@/components/portal/scroll-reset";
import { PageTitle } from "@/components/portal/ui";

export default async function AdminJobs({ searchParams }: PageProps<"/admin/jobs">) {
  await requireStaff();
  const query = parseJobQuery(await searchParams);
  const [{ jobs, total, pageCount }, allEvents] = await Promise.all([
    searchJobs(query, { includeInactive: true }),
    getEvents({ includeInactive: true, search: query.q }),
  ]);
  // Hiring events sit above the openings on the first page, narrowed by the same search, airline and status filters.
  const events =
    query.page === 1
      ? allEvents.filter(
          (e) => eventMatchesSources(e.source, query.source) && (query.status !== "active" || e.is_active) && (query.status !== "hidden" || !e.is_active),
        )
      : [];
  events.sort((a, b) => Number(isIndianSource(b.source)) - Number(isIndianSource(a.source)));

  return (
    <>
      <ScrollReset key={query.page} />
      <PageTitle title="Jobs" text="Each airline has its own scraper that refreshes its listings daily. Hide anything you don't want students to see." />
      <JobFilters basePath="/admin/jobs" query={query} total={total} staff />
      {events.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-ink">Upcoming hiring events ({events.length})</h2>
          <EventList events={events} basePath="/admin/jobs" actions={(event) => <ListingActions kind="event" item={event} />} />
        </section>
      )}
      <JobList jobs={jobs} basePath="/admin/jobs" actions={(job) => <ListingActions kind="job" item={job} />} />
      <Pagination
        page={Math.min(query.page, pageCount)}
        pageCount={pageCount}
        total={total}
        pageSize={JOBS_PAGE_SIZE}
        href={(page) => jobQueryHref("/admin/jobs", query, { page })}
      />
    </>
  );
}
