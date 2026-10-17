import { ConciergeBell, GraduationCap, LayoutGrid, Luggage, Plane, ShoppingBag, type LucideProps } from "lucide-react";

const icons: Record<string, typeof Plane> = {
  "cabin-crew": Plane,
  "ground-operations": Luggage,
  hospitality: ConciergeBell,
  "retail-operations": ShoppingBag,
};

/** Icon for a course slug; a grid for "all courses" (""), a cap for anything unknown. */
export function CourseIcon({ course, ...props }: { course: string | null } & LucideProps) {
  const Icon = course === "" ? LayoutGrid : (course && icons[course]) || GraduationCap;
  return <Icon strokeWidth={1.75} aria-hidden {...props} />;
}
