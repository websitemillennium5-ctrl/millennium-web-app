import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getEventDetail } from "@/lib/data";
import { EventDetail } from "@/components/portal/listing-detail";
import { ListingActions } from "@/components/portal/listing-actions";

export default async function AdminEventDetail({ params }: PageProps<"/admin/jobs/events/[source]/[id]">) {
  await requireStaff();
  const { source, id } = await params;
  const detail = await getEventDetail(source, id);
  if (!detail) notFound();
  return <EventDetail {...detail} basePath="/admin/jobs" actions={<ListingActions kind="event" item={detail.event} from="detail" />} />;
}
