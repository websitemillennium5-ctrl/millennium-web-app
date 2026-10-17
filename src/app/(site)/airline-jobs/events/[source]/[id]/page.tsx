import { notFound } from "next/navigation";
import { getEventDetail } from "@/lib/data";
import { EventDetail } from "@/components/portal/listing-detail";

export default async function PublicEventDetail({ params }: PageProps<"/airline-jobs/events/[source]/[id]">) {
  const { source, id } = await params;
  const detail = await getEventDetail(source, id);
  if (!detail?.event.is_active) notFound();
  return (
    <section className="portal container-x pt-32 pb-16 lg:pt-40">
      <EventDetail {...detail} basePath="/airline-jobs" gated />
    </section>
  );
}
