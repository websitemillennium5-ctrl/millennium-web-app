import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { scrapers, type SourceStat, type SyncRun, type SyncWorker } from "@/lib/sync";
import { SyncPanel } from "@/components/portal/sync-panel";
import { PageTitle } from "@/components/portal/ui";

export default async function AdminSync() {
  await requireStaff();
  const supabase = await createClient();

  const [{ data: runs }, { data: workers }, tables] = await Promise.all([
    supabase.from("sync_runs").select("*, requester:profiles(full_name)").order("created_at", { ascending: false }).limit(20),
    supabase.from("sync_workers").select("*").order("last_seen", { ascending: false }),
    // Listing count and freshness per table, whichever machine (GitHub or the local worker) last synced it.
    Promise.all(
      scrapers.map((s) =>
        supabase.from(s.table).select("scraped_at", { count: "exact" }).order("scraped_at", { ascending: false }).limit(1),
      ),
    ),
  ]);

  const history = (runs ?? []) as SyncRun[];
  const sources: SourceStat[] = scrapers.map((s, i) => {
    // The most recent panel/worker result for this source.
    const run = history.find((r) => r.results.some((x) => x.name === s.name));
    const result = run?.results.find((x) => x.name === s.name);
    return {
      ...s,
      count: tables[i].count ?? 0,
      lastScraped: tables[i].data?.[0]?.scraped_at ?? null,
      last: result && run ? { ...result, at: run.finished_at ?? run.started_at ?? run.created_at } : null,
    };
  });

  return (
    <>
      <PageTitle
        title="Sync listings"
        text="Refresh airline jobs and hiring events on demand. The sync runs on the office worker machine and saves straight to the database."
      />
      <SyncPanel runs={history} workers={(workers ?? []) as SyncWorker[]} sources={sources} />
    </>
  );
}
