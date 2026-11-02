import type { Metadata } from "next";
import { ChatAlerts } from "@/components/portal/chat-alerts";
import { LeadAlerts } from "@/components/portal/lead-alerts";
import { PortalShell } from "@/components/portal/shell";
import { requireStaff } from "@/lib/auth";
import { canAccess } from "@/lib/portal-pages";

export const metadata: Metadata = { title: "Staff portal", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireStaff();
  return (
    <PortalShell portal="admin" profile={profile}>
      {children}
      {/* Portal-wide popups, stacked in the corner so a chat alarm and an enquiry never cover each other */}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(23rem,calc(100vw-2rem))] flex-col gap-3 *:pointer-events-auto">
        {canAccess(profile, "leads") && <LeadAlerts />}
        {canAccess(profile, "chats") && <ChatAlerts />}
      </div>
    </PortalShell>
  );
}
