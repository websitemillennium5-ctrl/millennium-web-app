import { ArrowUpRight, CalendarDays, Globe, MapPin, Sparkles } from "lucide-react";
import { airlineBrand, roleCategory } from "@/lib/airlines";
import type { Job } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { sourceLabel } from "@/lib/job-sources";
import { ApplyButton } from "@/components/portal/apply-button";
import { BrandLogo, CardFooter, CardPanel, CardShell, CardTitle, GridCells, GridRow } from "@/components/portal/card-grid";
import { RoleIcon } from "@/components/portal/role-icon";
import { Badge, Empty, Meter } from "@/components/portal/ui";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "Today", "Yesterday", "3 days ago"… falling back to the date after a month. */
function ago(value: string) {
  const days = Math.round((new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (days < -30) return formatDate(value);
  const text = relative.format(days, "day");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const DAY = 86_400_000;
const dayDiff = (value: string) => Math.round((new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);

/** Hiring-event sources (IndiGo, SpiceJet) store the upcoming event date in posted_at. */
const isUpcoming = (date: string | null) => !!date && new Date(date).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);

/** Footer status: upcoming hiring event (green), fresh posting (red "New"), otherwise a neutral "3 days ago". */
function Status({ job }: { job: Job }) {
  const date = job.posted_at ?? job.scraped_at;
  if (isUpcoming(job.posted_at)) {
    const days = dayDiff(job.posted_at!);
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-good/25 bg-good/10 px-2.5 py-1 text-xs font-medium text-good">
        <span className="size-1.5 animate-pulse rounded-full bg-good" />
        Hiring event {days === 1 ? "tomorrow" : `in ${days} days`}
      </span>
    );
  }
  if (dayDiff(date) >= -3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-dark">
        <Sparkles className="size-3" /> New · {ago(date)}
      </span>
    );
  }
  return <Badge>{ago(date)}</Badge>;
}

/** Right rail: how fresh the listing is, as a big label plus a 5-bar meter. */
export function Freshness({ job }: { job: Job }) {
  const date = job.posted_at ?? job.scraped_at;
  if (isUpcoming(job.posted_at)) {
    const days = dayDiff(job.posted_at!);
    return (
      <>
        <p className="text-2xl font-semibold tracking-tight text-good">{days === 1 ? "Tomorrow" : `${days} days`}</p>
        <Meter value={1} />
        <p className="text-[12.5px] font-medium text-good">Until hiring event</p>
      </>
    );
  }
  const age = Math.max(-dayDiff(date), 0);
  const [value, caption] =
    age <= 3
      ? [1, "Fresh listing"]
      : age <= 7
        ? [0.8, "This week"]
        : age <= 30
          ? [0.6, "This month"]
          : age <= 90
            ? [0.4, "A while ago"]
            : [0.2, "Older listing"];
  const big = age === 0 ? "Today" : age <= 30 ? `${age}d ago` : formatDate(date);
  return (
    <>
      <p className={`font-semibold tracking-tight ${age <= 30 ? "text-2xl" : "text-lg"} ${age <= 3 ? "text-good" : "text-ink"}`}>{big}</p>
      <Meter value={value} tone={age <= 7 ? "good" : "ink"} />
      <p className={`text-[12.5px] font-medium ${age <= 3 ? "text-good" : "text-muted"}`}>{caption}</p>
    </>
  );
}

export const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Detail page for a job under `basePath` (e.g. /student/jobs/emirates/<id>). */
export const jobHref = (basePath: string, job: Job) => `${basePath}/${job.source}/${job.id}`;

/** `gated`: the public page swaps the direct link for the student-check / lead-capture popup. */
export function JobList({
  jobs,
  actions,
  basePath,
  gated,
}: {
  jobs: Job[];
  actions?: (job: Job) => React.ReactNode;
  basePath?: string;
  gated?: boolean;
}) {
  if (jobs.length === 0) return <Empty>No jobs match these filters. Try clearing some of them.</Empty>;
  return (
    <ul className="space-y-4">
      {jobs.map((job) => {
        const brand = airlineBrand(job.source, job.company);
        const category = roleCategory(job.title, job.source);
        // Only mention the source when it adds something (not "Lufthansa Group · via Lufthansa Group" or a raw key)
        const label = sourceLabel(job.source);
        const via = label !== job.company && !label.includes("_") ? label : null;
        return (
          <CardShell key={`${job.source}:${job.id}`}>
            <CardPanel tint={brand.color} rail={<Freshness job={job} />}>
              <div className="flex items-start gap-4 p-4 sm:px-5">
                <BrandLogo brand={brand} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle href={basePath && jobHref(basePath, job)}>{job.title}</CardTitle>
                    {!job.is_active && <Badge>Hidden</Badge>}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    <span className="font-medium" style={{ color: brand.color }}>
                      {job.company}
                    </span>
                    {via && (
                      <>
                        <span className="px-1.5">·</span>via {via}
                      </>
                    )}
                  </p>
                  {job.location && (
                    <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                      <MapPin className="size-3.5 shrink-0 text-muted" strokeWidth={1.75} />
                      <span className="truncate">{job.location}</span>
                    </p>
                  )}
                </div>
              </div>
              <GridRow label="At a glance">
                <GridCells
                  cells={[
                    {
                      label: "Role",
                      value: category ? (
                        <span className="inline-flex items-center gap-1.5">
                          <RoleIcon role={category.key} className="size-3.5 text-muted" />
                          {category.label}
                        </span>
                      ) : (
                        "Other roles"
                      ),
                    },
                    {
                      label: "Posted",
                      value: (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-muted" strokeWidth={1.75} />
                          {job.posted_at ? formatDate(job.posted_at) : "Not stated"}
                        </span>
                      ),
                    },
                    {
                      label: "Apply on",
                      value: (
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="size-3.5 text-muted" strokeWidth={1.75} />
                          {host(job.url)}
                        </span>
                      ),
                    },
                  ]}
                />
              </GridRow>
              {job.description && (
                <GridRow label="About the role">
                  <p className="line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">{job.description}</p>
                </GridRow>
              )}
            </CardPanel>

            <CardFooter status={<Status job={job} />}>
              {actions?.(job)}
              {gated ? (
                <ApplyButton url={job.url} listing={`${job.title} · ${job.company}`} />
              ) : (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark"
                >
                  View &amp; apply <ArrowUpRight className="size-3.5" />
                </a>
              )}
            </CardFooter>
          </CardShell>
        );
      })}
    </ul>
  );
}
