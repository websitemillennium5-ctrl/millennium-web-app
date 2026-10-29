import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getJobDetail, getRecruiterEmails } from "@/lib/data";
import { JobDetail } from "@/components/portal/listing-detail";

export default async function StudentJobDetail({ params }: PageProps<"/student/jobs/[source]/[id]">) {
  const profile = await requireStudent();
  const { source, id } = await params;
  const [detail, recruiters] = await Promise.all([getJobDetail(source, id), getRecruiterEmails()]);
  if (!detail) notFound();
  return <JobDetail {...detail} basePath="/student/jobs" recruiters={recruiters} applicant={profile} />;
}
