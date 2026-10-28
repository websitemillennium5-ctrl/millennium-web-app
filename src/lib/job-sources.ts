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
  // Hotel groups (scripts/scrapers/<key>.mjs, tables from supabase/migrations/0014_hotel_jobs.sql)
  marriott: "Marriott",
  radisson: "Radisson Hotel Group",
  accor: "Accor",
  hilton: "Hilton",
  hyatt: "Hyatt",
  ihcl: "IHCL (Taj)",
  lemon_tree: "Lemon Tree Hotels",
  itc: "ITC Limited",
  fortune: "Fortune Hotels",
  wyndham: "Wyndham",
  nile: "NILE Hospitality",
} as const;

/** Hotel-group sources: listed after the airlines in the filter chips and treated as hospitality roles. */
export const hotelSources: string[] = ["marriott", "radisson", "accor", "hilton", "hyatt", "ihcl", "lemon_tree", "itc", "fortune", "wyndham", "nile"];

export const isHotelSource = (source: string) => hotelSources.includes(source);

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

/** Indian airlines, listed first in the employer chips and the hiring events. */
export const indianSources = ["air_india", "indigo", "spicejet", "akasa", "star_air", "fly91"];

export const isIndianSource = (source: string) => indianSources.some((key) => eventMatchesSource(source, key));

const rank = (key: string) => (indianSources.includes(key) ? indianSources.indexOf(key) : isHotelSource(key) ? indianSources.length + 1 : indianSources.length);

/** Employer filter chips: Indian airlines first (in indianSources order), other airlines, hotel groups, then hand-added jobs. */
export const employerFilters: [string, string][] = [
  ...([...Object.entries(jobSources), ...Object.entries(eventOnlySources)] as [string, string][]).sort((a, b) => rank(a[0]) - rank(b[0])),
  ["manual", "Placement team"],
];

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
