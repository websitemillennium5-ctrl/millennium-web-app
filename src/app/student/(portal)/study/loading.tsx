import { ListSkeleton } from "@/components/portal/student-skeletons";

export default function Loading() {
  return <ListSkeleton rows={3} rowClassName="h-32" />;
}
