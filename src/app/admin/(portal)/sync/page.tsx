import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GITHUB_REPO, GITHUB_WORKFLOW, localOnlyScrapers, NEW_WINDOW_MS, scrapers, type GithubRun, type SourceStat, type SyncRun, type SyncWorker } from "@/lib/sync";
import { SyncPanel } from "@/components/portal/sync-panel";
import { PageTitle } from "@/components/portal/ui";

/** The latest daily GitHub sync. The repo is public, so no token is needed; cached for a few minutes to stay under the rate limit. */
async function latestGithubRun(): Promise<GithubRun | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/runs?per_page=1`, {
      headers: { accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN && { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return ((await res.json()).workflow_runs?.[0] as GithubRun | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Start of the "new today" window. Each request renders fresh, so reading the clock here is fine. */
const newSince = () => new Date(Date.now() - NEW_WINDOW_MS).toISOString();

export default async function AdminSync() {
  await requireStaff();
  const supabase = await createClient();

  const [{ data: runs }, { data: workers }, tables, github] = await Promise.all([
    supabase.from("sync_runs").select("*, requester:profiles(full_name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("sync_workers").select("*").order("last_seen", { ascending: false }),
    // Listing count and freshness per table.
    Promise.all(scrapers.map((s) => supabase.from(s.table).select("scraped_at", { count: "exact" }).order("scraped_at", { ascending: false }).limit(1))),
    latestGithubRun(),
  ]);

  // Listings first seen in the last 24 hours (rows keep created_at across re-syncs), i.e. what the daily sync brought in.
  const since = newSince();
  const added = await Promise.all(scrapers.map((s) => supabase.from(s.table).select("id", { count: "exact", head: true }).gte("created_at", since)));

  const history = (runs ?? []) as SyncRun[];
  const sources: SourceStat[] = scrapers.map((s, i) => {
    const run = history.find((r) => r.results.some((x) => x.name === s.name));
    const result = run?.results.find((x) => x.name === s.name);
    return {
      ...s,
      count: tables[i].count ?? 0,
      added: added[i].count ?? 0,
      lastScraped: tables[i].data?.[0]?.scraped_at ?? null,
      last: result && run ? { ...result, at: run.finished_at ?? run.started_at ?? run.created_at } : null,
    };
  });

  return (
    <>
      <PageTitle title="Sync listings" text="Airline jobs and hiring events refresh by themselves every day. IndiGo and Fly91 can also be refreshed on demand." />
      <SyncPanel
        runs={history}
        workers={(workers ?? []) as SyncWorker[]}
        local={localOnlyScrapers.map((name) => sources.find((s) => s.name === name)!)}
        cloud={sources.filter((s) => !localOnlyScrapers.includes(s.name))}
        github={github}
      />
    </>
  );
}
