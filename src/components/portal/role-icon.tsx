import { ConciergeBell, LayoutGrid, Luggage, Plane, type LucideProps } from "lucide-react";
import type { RoleKey } from "@/lib/airlines";

const icons = { cabin: Plane, ground: Luggage, hospitality: ConciergeBell };

/** Icon for a role family (plane, luggage, concierge bell); a grid for "all roles". */
export function RoleIcon({ role, ...props }: { role: RoleKey | "" } & LucideProps) {
  const Icon = role ? icons[role] : LayoutGrid;
  return <Icon strokeWidth={1.75} aria-hidden {...props} />;
}
