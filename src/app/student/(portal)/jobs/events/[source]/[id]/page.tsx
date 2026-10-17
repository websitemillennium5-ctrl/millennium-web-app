import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { getEventDetail } from "@/lib/data";
import { EventDetail } from "@/components/portal/listing-detail";

export default async function StudentEventDetail({ params }: PageProps<"/student/jobs/events/[source]/[id]">) {
  await requireStudent();
  const { source, id } = await params;
  const detail = await getEventDetail(source, id);
  if (!detail) notFound();
  return <EventDetail {...detail} basePath="/student/jobs" />;
}
