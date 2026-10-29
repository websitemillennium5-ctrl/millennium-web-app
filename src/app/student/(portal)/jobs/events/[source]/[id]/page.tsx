import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getEventDetail, getRecruiterEmails } from "@/lib/data";
import { EventDetail } from "@/components/portal/listing-detail";

export default async function StudentEventDetail({ params }: PageProps<"/student/jobs/events/[source]/[id]">) {
  const profile = await requireStudent();
  const { source, id } = await params;
  const [detail, recruiters] = await Promise.all([getEventDetail(source, id), getRecruiterEmails()]);
  if (!detail) notFound();
  return <EventDetail {...detail} basePath="/student/jobs" recruiters={recruiters} applicant={profile} />;
}
