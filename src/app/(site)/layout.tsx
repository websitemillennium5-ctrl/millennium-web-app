import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FooterGate } from "@/components/footer-gate";
import { FloatingActions } from "@/components/floating-actions";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteBoot } from "@/components/site-boot";
import { PlacementsDock, PlacementsPopup } from "@/components/placements-highlight";
import { ContactChat } from "@/components/contact-chat";
import { CounsellingModal } from "@/components/counselling";

// Public marketing site chrome. The student and admin portals have their own layouts.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteBoot />
      <SmoothScroll />
      <Header />
      <main className="flex-1">{children}</main>
      <FooterGate>
        <Footer />
      </FooterGate>
      <FloatingActions />
      <PlacementsPopup />
      <PlacementsDock />
      <ContactChat />
      <CounsellingModal />
    </>
  );
}
