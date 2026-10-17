import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/shell";
import { requireStudent } from "@/lib/auth";

export const metadata: Metadata = { title: "Student portal", robots: { index: false } };

export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  const profile = await requireStudent();
  return (
    <PortalShell portal="student" profile={profile}>
      {children}
    </PortalShell>
  );
}
