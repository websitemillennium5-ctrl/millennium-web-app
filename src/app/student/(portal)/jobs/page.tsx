import { requireStudent } from "@/lib/auth";
import { getEvents, getRecruiterEmails, searchJobs } from "@/lib/data";
import { eventMatchesRole } from "@/lib/airlines";
import { eventMatchesSources, isIndianSource } from "@/lib/job-sources";
import { JOBS_PAGE_SIZE, jobQueryHref, parseJobQuery } from "@/lib/job-query";
import { EventList } from "@/components/portal/event-list";
import { JobFilters, JobFiltersSheet, JobNavProvider, JobResults, JobResultsBar } from "@/components/portal/job-filters";
import { JobList } from "@/components/portal/job-list";
import { Pagination } from "@/components/portal/pagination";
import { ScrollReset } from "@/components/portal/scroll-reset";
import { PageTitle } from "@/components/portal/ui";

export default async function StudentJobs({ searchParams }: PageProps<"/student/jobs">) {
  const profile = await requireStudent();
  const query = parseJobQuery(await searchParams);
  const [{ jobs, total, pageCount }, allEvents, recruiters] = await Promise.all([searchJobs(query), getEvents({ search: query.q }), getRecruiterEmails()]);
  // Hiring events sit above the openings on the first page, narrowed by the same search and airline filters;
  // the filter sheet's button counts them on every page.
  const matchingEvents = allEvents.filter((e) => eventMatchesSources(e.source, query.source) && eventMatchesRole(e, query.role));
  const events = query.page === 1 ? matchingEvents : [];
  events.sort((a, b) => Number(isIndianSource(b.source)) - Number(isIndianSource(a.source)));

  return (
    <>
      <ScrollReset key={query.page} />
      <PageTitle title="Airline jobs" />
      <JobNavProvider basePath="/student/jobs" query={query}>
        {/* Same layout as the public jobs board on a phone: search and role tabs up top, the rest in a bottom sheet */}
        <JobFilters basePath="/student/jobs" query={query} total={total} sidebar />
        <JobFiltersSheet basePath="/student/jobs" query={query} total={total} eventCount={matchingEvents.length} />
        <JobResultsBar basePath="/student/jobs" query={query} total={total} eventCount={events.length} />
        <JobResults>
          {events.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-ink">Upcoming hiring events</h2>
              <EventList events={events} basePath="/student/jobs" recruiters={recruiters} applicant={profile} />
            </section>
          )}
          <JobList jobs={jobs} basePath="/student/jobs" recruiters={recruiters} applicant={profile} />
          <Pagination
            page={Math.min(query.page, pageCount)}
            pageCount={pageCount}
            total={total}
            pageSize={JOBS_PAGE_SIZE}
            href={(page) => jobQueryHref("/student/jobs", query, { page })}
          />
        </JobResults>
      </JobNavProvider>
    </>
  );
}
