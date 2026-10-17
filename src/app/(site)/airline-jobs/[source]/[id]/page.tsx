import { notFound } from "next/navigation";
import { getJobDetail } from "@/lib/data";
import { JobDetail } from "@/components/portal/listing-detail";

export default async function PublicJobDetail({ params }: PageProps<"/airline-jobs/[source]/[id]">) {
  const { source, id } = await params;
  const detail = await getJobDetail(source, id);
  if (!detail?.job.is_active) notFound();
  return (
    <section className="portal container-x pt-32 pb-16 lg:pt-40">
      <JobDetail {...detail} basePath="/airline-jobs" gated />
    </section>
  );
}
