/**
 * Every scraped job source has its own Supabase table (`jobs_<key>`) and worker (scripts/scrapers/<key>.mjs).
 * Hand-added jobs live in `jobs` with source "manual". Keep in sync with supabase/migrations/0002_job_sources.sql.
 */
export const jobSources = {
  emirates: "Emirates Group",
  qatar_airways: "Qatar Airways",
  etihad: "Etihad Airways",
  lufthansa: "Lufthansa Group",
  flydubai: "flydubai",
  british_airways: "British Airways",
  air_arabia: "Air Arabia",
  air_india: "Air India",
  akasa: "Akasa Air",
  star_air: "Star Air",
  fly91: "Fly91",
} as const;

export type JobSource = keyof typeof jobSources;

/** The table a job row lives in. Anything unrecognised is treated as a hand-added job. */
export function jobTable(source: string) {
  return source in jobSources ? `jobs_${source}` : "jobs";
}

/** Airlines that only post hiring events (no job table), so they still get an airline filter chip on the Jobs page. */
export const eventOnlySources = { indigo: "IndiGo", spicejet: "SpiceJet" } as const;

export function sourceLabel(source: string) {
  return (
    jobSources[source as JobSource] ??
    eventOnlySources[source as keyof typeof eventOnlySources] ??
    (source === "manual" ? "Placement team" : source)
  );
}

/** Indian airlines, listed first in the airline chips and the hiring events. */
export const indianSources = ["air_india", "indigo", "spicejet", "akasa", "star_air", "fly91"];

export const isIndianSource = (source: string) => indianSources.some((key) => eventMatchesSource(source, key));

/** Whether an event source belongs to the airline filter `source` ("indigo" covers indigo_cabin_crew and indigo_ground_staff). */
export const eventMatchesSource = (eventSource: string, source: string) =>
  !source || eventSource === source || eventSource.startsWith(`${source}_`);

/** Whether an event source belongs to any of the selected airline filters (none selected = all airlines). */
export const eventMatchesSources = (eventSource: string, sources: string[]) =>
  sources.length === 0 || sources.some((source) => eventMatchesSource(eventSource, source));

/**
 * Hiring-event sources (walk-ins, open days, interview drives): table `events_<key>`, worker
 * scripts/scrapers/events/<key>.mjs, brand shown on the Hiring events page. Keep in sync with the events migration.
 */
export const eventSources = {
  indigo_cabin_crew: "IndiGo",
  indigo_ground_staff: "IndiGo",
  spicejet: "SpiceJet",
  emirates: "Emirates",
  qatar_airways: "Qatar Airways",
  etihad: "Etihad Airways",
  air_arabia: "Air Arabia",
  flydubai: "flydubai",
  air_india: "Air India",
  akasa: "Akasa Air",
} as const;

export type EventSource = keyof typeof eventSources;

/** Brand names with at least one event source, for the brand filter. */
export const eventBrands = [...new Set(Object.values(eventSources))];

export function eventTable(source: string) {
  if (!(source in eventSources)) throw new Error(`Unknown event source: ${source}`);
  return `events_${source}`;
}
