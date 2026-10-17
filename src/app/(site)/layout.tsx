import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FloatingActions } from "@/components/floating-actions";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteBoot } from "@/components/site-boot";

// Public marketing site chrome. The student and admin portals have their own layouts.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteBoot />
      <SmoothScroll />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingActions />
    </>
  );
}
