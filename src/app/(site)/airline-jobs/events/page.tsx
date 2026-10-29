import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEvents } from "@/lib/data";
import { eventMatchesRole } from "@/lib/airlines";
import { eventMatchesSources, isIndianSource } from "@/lib/job-sources";
import { jobQueryHref, parseJobQuery } from "@/lib/job-query";
import { CtaBand } from "@/components/ui";
import { EventList } from "@/components/portal/event-list";

export const metadata: Metadata = {
  title: "Airline Hiring Events",
  description: "Upcoming cabin crew and ground staff walk-in interviews, open days and hiring drives from IndiGo, Air India, Akasa Air, Emirates, Qatar Airways, Etihad and more.",
};

/** Every upcoming hiring event matching the jobs board's filters; the board itself shows only the first few. */
export default async function AirlineEventsPage({ searchParams }: PageProps<"/airline-jobs/events">) {
  const query = parseJobQuery(await searchParams);
  const allEvents = await getEvents({ search: query.q });
  const events = allEvents.filter((e) => eventMatchesSources(e.source, query.source) && eventMatchesRole(e, query.role));
  events.sort((a, b) => Number(isIndianSource(b.source)) - Number(isIndianSource(a.source)));

  return (
    <>
      <section className="portal container-x pt-28 pb-12 lg:pt-36 lg:pb-16">
        <div className="mx-auto max-w-3xl">
          <Link href={jobQueryHref("/airline-jobs", query)} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
            <ArrowLeft className="size-4" /> Back to all jobs
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Upcoming hiring events</h1>
          <p className="mt-2 mb-8 text-sm text-muted">
            {events.length} walk-in{events.length === 1 ? "" : "s"}, open days and drives{query.q ? ` matching “${query.q}”` : ""}, Indian airlines first.
          </p>
          <EventList events={events} basePath="/airline-jobs" gated />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
