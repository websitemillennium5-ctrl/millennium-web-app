import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/shell";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Staff portal", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireStaff();
  return (
    <PortalShell portal="admin" profile={profile}>
      {children}
    </PortalShell>
  );
}
