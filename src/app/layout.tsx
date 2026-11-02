import type { Metadata, Viewport } from "next";
import { Caveat, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { ScrollToTop } from "@/components/scroll-to-top";

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

// maximum-scale=1 stops iPhone Safari zooming the page in when a text box smaller than 16px is focused
// (the chat, enquiry form and portal inputs). Pinch-zoom still works on iOS.
// interactiveWidget makes Android Chrome shrink the page for the keyboard; iOS is handled in the chat itself.
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, interactiveWidget: "resizes-content" };

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
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
