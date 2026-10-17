import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getJobDetail } from "@/lib/data";
import { JobDetail } from "@/components/portal/listing-detail";

export default async function StudentJobDetail({ params }: PageProps<"/student/jobs/[source]/[id]">) {
  await requireStudent();
  const { source, id } = await params;
  const detail = await getJobDetail(source, id);
  if (!detail) notFound();
  return <JobDetail {...detail} basePath="/student/jobs" />;
}
