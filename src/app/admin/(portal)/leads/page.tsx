import { requireStaff } from "@/lib/auth";
import { getLeads } from "@/lib/data";
import { leadStats, leadStatuses, parseLeadQuery, type LeadStatus } from "@/lib/leads";
import { LeadFilters } from "@/components/portal/lead-filters";
import { LeadTable } from "@/components/portal/lead-table";
import { Empty, PageTitle, Stat } from "@/components/portal/ui";

/** Read once per request; the page always renders fresh. */
const requestTime = () => Date.now();

export default async function AdminLeads({ searchParams }: PageProps<"/admin/leads">) {
  await requireStaff();
  const query = parseLeadQuery(await searchParams);
  const all = await getLeads();

  const q = query.q.toLowerCase();
  const matching = all.filter(
    (l) => (!query.source || l.source === query.source) && (!q || [l.name, l.phone, l.email, l.city].some((v) => v?.toLowerCase().includes(q))),
  );
  const counts = Object.fromEntries([["", matching.length], ...leadStatuses.map((s) => [s.value, matching.filter((l) => l.status === s.value).length])]) as Record<
    LeadStatus | "",
    number
  >;
  const leads = query.status ? matching.filter((l) => l.status === query.status) : matching;
  const now = requestTime();
  const stats = leadStats(all, now);

  return (
    <>
      <PageTitle title="Leads" text="Website enquiries and jobs-page applicants. Update each one's status as you follow up." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total leads" value={stats.total.toLocaleString("en-IN")} hint={`${stats.week} in the last 7 days`} />
        <Stat
          label="Awaiting follow-up"
          value={stats.open}
          tone={stats.overdue ? "warn" : "default"}
          hint={stats.overdue ? `${stats.overdue} waiting over 2 days` : "all caught up"}
        />
        <Stat label="Converted" value={stats.converted} tone={stats.converted ? "good" : "default"} hint="joined a course" />
        <Stat
          label="Conversion rate"
          value={stats.rate === null ? "—" : `${Math.round(stats.rate * 100)}%`}
          meter={stats.rate ?? 0}
          hint={stats.rate === null ? "no outcomes yet" : "of leads with an outcome"}
        />
      </div>
      <LeadFilters query={query} total={leads.length} counts={counts} />
      {leads.length === 0 ? <Empty>No leads match these filters.</Empty> : <LeadTable leads={leads} now={now} />}
    </>
  );
}
