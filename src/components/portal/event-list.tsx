import { ArrowUpRight, CalendarDays, CalendarPlus, Clock, MapPin, UserRound } from "lucide-react";
import { airlineBrand } from "@/lib/airlines";
import type { HiringEvent } from "@/lib/data";
import { emailAddress, isEmailLink, linkProps } from "@/lib/format";
import { recruitersFor, type Applicant, type RecruiterBook } from "@/lib/recruiters";
import { EmailRecruiterButton } from "@/components/portal/email-recruiter";
import { BrandLogo, CardFooter, CardPanel, CardShell, CardTitle, GridCells, GridRow } from "@/components/portal/card-grid";
import { ApplyButton } from "@/components/portal/apply-button";
import { Badge, Empty, Meter } from "@/components/portal/ui";

export const typeLabel: Record<HiringEvent["event_type"], string> = {
  walk_in: "Walk-in",
  open_day: "Open day",
  interview: "Interview",
  online_drive: "Online drive",
  other: "Hiring event",
};

export const dateFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "short" });
const weekdayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long" });

export const eventDay = (date: string) => new Date(`${date}T12:00:00`);
const daysUntil = (date: string) => Math.round((eventDay(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);

/** Google Calendar "add event" link for an all-day event on the event date. */
export function calendarUrl(event: HiringEvent) {
  const day = event.event_date!.replace(/-/g, "");
  const next = new Date(eventDay(event.event_date!).getTime() + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${event.brand}: ${event.title}`,
    dates: `${day}/${next}`,
    details: [
      event.event_time && `Time: ${event.event_time}`,
      event.apply_url && (isEmailLink(event.apply_url) ? `Apply by email: ${emailAddress(event.apply_url)}` : `Register: ${event.apply_url}`),
      event.url,
    ]
      .filter(Boolean)
      .join("\n"),
    location: event.venue ?? [event.city, event.country].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** "Add to calendar" button (Google Calendar), shown up front on cards and the detail page. Dated events only. */
export function AddToCalendar({ event }: { event: HiringEvent }) {
  if (!event.event_date) return null;
  return (
    <a
      href={calendarUrl(event)}
      target="_blank"
      rel="noreferrer"
      title="Add to Google Calendar"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25"
    >
      <CalendarPlus className="size-4" strokeWidth={1.75} /> Add to calendar
    </a>
  );
}

/** Right rail: big calendar date with a countdown meter that fills as the event gets closer. */
export function DateRail({ event }: { event: HiringEvent }) {
  if (!event.event_date) {
    const online = event.event_type === "online_drive";
    return (
      <>
        <p className="text-2xl font-semibold tracking-tight text-ink">{online ? "Online" : "TBA"}</p>
        <Meter value={online ? 1 : 0} tone="ink" />
        <p className="text-[12.5px] font-medium text-muted">{online ? "Apply any time" : "Date to be announced"}</p>
      </>
    );
  }
  const date = eventDay(event.event_date);
  const days = daysUntil(event.event_date);
  const soon = days <= 7;
  return (
    <>
      <p className={`flex items-baseline gap-1.5 font-semibold tracking-tight ${soon ? "text-good" : "text-ink"}`}>
        <span className="text-3xl leading-none">{date.getDate()}</span>
        <span className="text-sm tracking-[0.12em] uppercase">{monthFormat.format(date)}</span>
      </p>
      <Meter value={Math.max(1 - days / 30, 0.1)} tone={soon ? "good" : "ink"} />
      <p className={`text-[12.5px] font-medium ${soon ? "text-good" : "text-muted"}`}>
        {days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`} · {weekdayFormat.format(date)}
      </p>
    </>
  );
}

/** Detail page for an event under `basePath` (e.g. /student/jobs/events/indigo_cabin_crew/<id>). */
export const eventHref = (basePath: string, event: HiringEvent) => `${basePath}/events/${event.source}/${event.id}`;

export function EventList({
  events,
  actions,
  basePath,
  gated,
  recruiters,
  applicant,
}: {
  events: HiringEvent[];
  actions?: (event: HiringEvent) => React.ReactNode;
  basePath?: string;
  /** Public page: one "Apply now" that opens the student-check / lead-capture popup instead of direct links. */
  gated?: boolean;
  /** Student portal: "Email recruiter" draft button for brands with an address on file. */
  recruiters?: RecruiterBook;
  applicant?: Applicant;
}) {
  if (events.length === 0) return <Empty>No upcoming hiring events right now. Check back soon.</Empty>;
  return (
    <ul className="space-y-4">
      {events.map((event) => {
        // Matched on the brand name, so e.g. Air India Express events from the Air India worker get their own logo
        const brand = airlineBrand("", event.brand);
        const place = [event.city, event.country].filter(Boolean).join(", ");
        return (
          <CardShell key={`${event.source}:${event.id}`}>
            <CardPanel tint={brand.color} rail={<DateRail event={event} />}>
              <div className="flex items-start gap-4 p-4 sm:px-5">
                <BrandLogo brand={brand} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle href={basePath && eventHref(basePath, event)}>{event.title}</CardTitle>
                    {!event.is_active && <Badge>Hidden</Badge>}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    <span className="font-medium" style={{ color: brand.color }}>
                      {event.brand}
                    </span>
                    <span className="px-1.5">·</span>
                    {typeLabel[event.event_type]}
                  </p>
                  {place && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                      <MapPin className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />
                      <span className="truncate">{place}</span>
                    </p>
                  )}
                </div>
              </div>
              <GridRow label="Event details">
                <GridCells
                  cells={[
                    {
                      label: "Date",
                      value: (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-muted" strokeWidth={1.75} />
                          {event.event_date
                            ? dateFormat.format(eventDay(event.event_date))
                            : event.event_type === "online_drive"
                              ? "Any time"
                              : "To be announced"}
                        </span>
                      ),
                    },
                    {
                      label: "Time",
                      value: (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5 text-muted" strokeWidth={1.75} />
                          {event.event_time ?? "See event page"}
                        </span>
                      ),
                    },
                    {
                      label: "Role",
                      value: (
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-3.5 text-muted" strokeWidth={1.75} />
                          {event.role ?? "Various"}
                        </span>
                      ),
                    },
                  ]}
                />
              </GridRow>
              {event.venue && (
                <GridRow label="Venue">
                  <p className="line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft sm:line-clamp-none">{event.venue}</p>
                </GridRow>
              )}
              {event.description && (
                <GridRow label="What to know">
                  <p className="line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">{event.description}</p>
                </GridRow>
              )}
            </CardPanel>

            <CardFooter status={<Badge tone="brand">{typeLabel[event.event_type]}</Badge>}>
              {actions?.(event)}
              {applicant && (
                <EmailRecruiterButton
                  emails={recruitersFor(recruiters, event.source, event.brand)}
                  listing={{ title: event.title, company: event.brand, location: place, url: event.apply_url ?? event.url, kind: "event" }}
                  applicant={applicant}
                />
              )}
              {gated ? (
                <ApplyButton url={event.apply_url ?? event.url} listing={`${event.title} · ${event.brand}`} />
              ) : (
                <>
                  <AddToCalendar event={event} />
                  {event.apply_url && event.apply_url !== event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25"
                    >
                      Event page <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                  <a
                    href={event.apply_url ?? event.url}
                    {...linkProps(event.apply_url ?? event.url)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark"
                  >
                    {event.apply_url ? (isEmailLink(event.apply_url) ? "Apply by email" : "Register") : "View details"}{" "}
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </>
              )}
            </CardFooter>
          </CardShell>
        );
      })}
    </ul>
  );
}
