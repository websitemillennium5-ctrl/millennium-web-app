import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getJobDetail } from "@/lib/data";
import { JobDetail } from "@/components/portal/listing-detail";
import { ListingActions } from "@/components/portal/listing-actions";

export default async function AdminJobDetail({ params }: PageProps<"/admin/jobs/[source]/[id]">) {
  await requireStaff();
  const { source, id } = await params;
  const detail = await getJobDetail(source, id);
  if (!detail) notFound();
  return <JobDetail {...detail} basePath="/admin/jobs" actions={<ListingActions kind="job" item={detail.job} from="detail" />} />;
}
