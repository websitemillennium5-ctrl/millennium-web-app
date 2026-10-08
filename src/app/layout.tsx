import type { Metadata } from "next";
import { Caveat, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FloatingActions } from "@/components/floating-actions";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Preloader } from "@/components/preloader";
import { site } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// Handwritten face for the sticky-note testimonials
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Best Air Hostess Academy in Patna`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: site.name,
    description: site.description,
    siteName: site.name,
    images: ["/images/cabin-crew.jpg"],
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${instrument.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Preloader />
        <SmoothScroll />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingActions />
      </body>
    </html>
  );
}
