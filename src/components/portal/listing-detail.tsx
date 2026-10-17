import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock, Globe, MapPin, Navigation, RefreshCw, UserRound } from "lucide-react";
import { airlineBrand, roleCategory } from "@/lib/airlines";
import type { HiringEvent, Job } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { sourceLabel } from "@/lib/job-sources";
import { BrandLogo, CardPanel, GridCells, GridRow } from "@/components/portal/card-grid";
import { AddToCalendar, DateRail, dateFormat, eventDay, typeLabel } from "@/components/portal/event-list";
import { Freshness, host } from "@/components/portal/job-list";
import { RoleIcon } from "@/components/portal/role-icon";
import { Badge } from "@/components/portal/ui";
import { ApplyButton } from "@/components/portal/apply-button";

const primaryButton =
  "inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark";
const secondaryButton =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25";

const withIcon = (icon: React.ReactNode, text: React.ReactNode) => (
  <span className="inline-flex items-center gap-1.5">
    {icon}
    {text}
  </span>
);
const icon = (Icon: typeof Clock) => <Icon className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />;

function BackLink({ basePath }: { basePath: string }) {
  return (
    <Link href={basePath} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
      <ArrowLeft className="size-4" /> All jobs &amp; hiring events
    </Link>
  );
}

/** Big version of the card header: logo, title, brand line and location. */
function Header({
  brand,
  title,
  subtitle,
  place,
  hidden,
}: {
  brand: ReturnType<typeof airlineBrand>;
  title: string;
  subtitle: React.ReactNode;
  place?: string | null;
  hidden: boolean;
}) {
  return (
    <div className="flex items-start gap-4 p-5 sm:px-6 sm:py-6">
      <BrandLogo brand={brand} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl leading-snug font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {hidden && <Badge>Hidden from students</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        {place && (
          <p className="mt-2.5 flex items-center gap-1.5 text-sm text-ink-soft">
            {icon(MapPin)}
            {place}
          </p>
        )}
      </div>
    </div>
  );
}

function Shell({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-1.5">
      {children}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">{footer}</div>
    </div>
  );
}

const mapsUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** `gated` (public page): a single "Apply now" behind the student-check / lead-capture popup replaces the direct links. */
export function EventDetail({
  event,
  basePath,
  actions,
  gated,
}: {
  event: HiringEvent;
  basePath: string;
  actions?: React.ReactNode;
  gated?: boolean;
}) {
  const brand = airlineBrand("", event.brand);
  const place = [event.city, event.country].filter(Boolean).join(", ");
  const where = event.venue ?? place;
  return (
    <>
      <BackLink basePath={basePath} />
      <Shell
        footer={
          <>
            <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <Badge tone="brand">{typeLabel[event.event_type]}</Badge>
              {withIcon(icon(RefreshCw), `Checked ${formatDate(event.scraped_at)}`)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {gated ? (
                <ApplyButton url={event.apply_url ?? event.url} listing={`${event.title} · ${event.brand}`} />
              ) : (
                <>
                  <AddToCalendar event={event} />
                  <a href={event.apply_url ?? event.url} target="_blank" rel="noreferrer" className={primaryButton}>
                    {event.apply_url ? "Register" : "View on airline site"} <ArrowUpRight className="size-3.5" />
                  </a>
                </>
              )}
            </div>
          </>
        }
      >
        <CardPanel tint={brand.color} rail={<DateRail event={event} />}>
          <Header
            brand={brand}
            title={event.title}
            hidden={!event.is_active}
            place={place}
            subtitle={
              <>
                <span className="font-medium" style={{ color: brand.color }}>
                  {event.brand}
                </span>
                <span className="px-1.5">·</span>
                {typeLabel[event.event_type]}
              </>
            }
          />
          <GridRow label="Event details">
            <GridCells
              cells={[
                {
                  label: "Date",
                  value: withIcon(
                    icon(CalendarDays),
                    event.event_date
                      ? dateFormat.format(eventDay(event.event_date))
                      : event.event_type === "online_drive"
                        ? "Any time"
                        : "To be announced",
                  ),
                },
                { label: "Time", value: withIcon(icon(Clock), event.event_time ?? "See event page") },
                { label: "Role", value: withIcon(icon(UserRound), event.role ?? "Various") },
              ]}
            />
          </GridRow>
          <GridRow label="Location">
            <GridCells
              cells={[
                { label: "City", value: event.city ?? (event.event_type === "online_drive" ? "Online" : "—") },
                { label: "Country", value: event.country ?? "—" },
                {
                  label: "Directions",
                  value: where ? (
                    <a href={mapsUrl(where)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                      {icon(Navigation)} Open in Google Maps
                    </a>
                  ) : (
                    "—"
                  ),
                },
              ]}
            />
          </GridRow>
          {event.venue && (
            <GridRow label="Venue">
              <p className="text-sm leading-relaxed text-ink-soft">{event.venue}</p>
            </GridRow>
          )}
          {event.description && (
            <GridRow label="What to know">
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">{event.description}</p>
            </GridRow>
          )}
          {!gated && (
            <GridRow label="Next steps">
              <div className="flex flex-wrap gap-2">
                {event.apply_url && (
                  <a href={event.apply_url} target="_blank" rel="noreferrer" className={secondaryButton}>
                    Register online <ArrowUpRight className="size-3.5" />
                  </a>
                )}
                <a href={event.url} target="_blank" rel="noreferrer" className={secondaryButton}>
                  Airline&apos;s event page <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </GridRow>
          )}
        </CardPanel>
      </Shell>
    </>
  );
}

export function JobDetail({ job, basePath, actions, gated }: { job: Job; basePath: string; actions?: React.ReactNode; gated?: boolean }) {
  const brand = airlineBrand(job.source, job.company);
  const category = roleCategory(job.title, job.source);
  const label = sourceLabel(job.source);
  const via = label !== job.company && !label.includes("_") ? label : null;
  return (
    <>
      <BackLink basePath={basePath} />
      <Shell
        footer={
          <>
            <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              {withIcon(icon(RefreshCw), `Checked ${formatDate(job.scraped_at)}`)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {gated ? (
                <ApplyButton url={job.url} listing={`${job.title} · ${job.company}`} />
              ) : (
                <a href={job.url} target="_blank" rel="noreferrer" className={primaryButton}>
                  View &amp; apply <ArrowUpRight className="size-3.5" />
                </a>
              )}
            </div>
          </>
        }
      >
        <CardPanel tint={brand.color} rail={<Freshness job={job} />}>
          <Header
            brand={brand}
            title={job.title}
            hidden={!job.is_active}
            place={job.location}
            subtitle={
              <>
                <span className="font-medium" style={{ color: brand.color }}>
                  {job.company}
                </span>
                {via && (
                  <>
                    <span className="px-1.5">·</span>via {via}
                  </>
                )}
              </>
            }
          />
          <GridRow label="At a glance">
            <GridCells
              cells={[
                {
                  label: "Role",
                  value: category ? withIcon(<RoleIcon role={category.key} className="size-3.5 text-muted" />, category.label) : "Other roles",
                },
                { label: "Posted", value: withIcon(icon(CalendarDays), job.posted_at ? formatDate(job.posted_at) : "Not stated") },
                { label: "Apply on", value: withIcon(icon(Globe), host(job.url)) },
              ]}
            />
          </GridRow>
          {job.location && (
            <GridRow label="Location">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
                <span>{job.location}</span>
                <a
                  href={mapsUrl(job.location)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink hover:underline"
                >
                  {icon(Navigation)} Open in Google Maps
                </a>
              </div>
            </GridRow>
          )}
          <GridRow label="About the role">
            <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft">
              {job.description ?? "The airline hasn't published a summary for this role. Open the listing for the full description."}
            </p>
          </GridRow>
          <GridRow label="How to apply">
            <p className="text-sm leading-relaxed text-ink-soft">
              Applications go through {job.company}&apos;s careers site ({host(job.url)}). Keep your CV, passport and certificates ready, and talk to
              the placement team if you&apos;d like help with your application.
            </p>
          </GridRow>
        </CardPanel>
      </Shell>
    </>
  );
}
