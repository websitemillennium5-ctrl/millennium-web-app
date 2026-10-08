import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { courses, nav, site, telHref } from "@/lib/site";
import { InstagramIcon, FacebookIcon } from "@/components/icons";
import { FooterLanding } from "@/components/flight/footer-landing";

export function Footer() {
  return (
    <footer className="bg-ink text-white/70">
      <FooterLanding />
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Image src="/images/logo-light.png" alt={site.name} width={900} height={174} className="h-10 w-auto" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            Bihar&apos;s oldest and most respected aviation &amp; hospitality training institute, shaping confident
            professionals for leading airlines and hotel brands.
          </p>
          <div className="mt-6 flex gap-3">
            <a href={site.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-full bg-white/10 p-2.5 transition hover:bg-brand hover:text-white">
              <InstagramIcon className="size-4" />
            </a>
            <a href={site.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-full bg-white/10 p-2.5 transition hover:bg-brand hover:text-white">
              <FacebookIcon className="size-4" />
            </a>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white">Academy</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link href="/" className="hover:text-white">Home</Link></li>
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-white">{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-white">Programs</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {courses.map((c) => (
              <li key={c.slug}>
                <Link href={`/courses/${c.slug}`} className="hover:text-white">{c.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-white">Get in touch</h3>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              <a href={site.address.mapsUrl} target="_blank" rel="noreferrer" className="hover:text-white">
                {site.address.line1}, {site.address.line2}
              </a>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand" />
              <span className="flex flex-col gap-1">
                {site.phones.map((p) => (
                  <a key={p} href={telHref(p)} className="hover:text-white">{p}</a>
                ))}
              </span>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand" />
              <span className="flex flex-col gap-1 break-all">
                {site.emails.map((e) => (
                  <a key={e} href={`mailto:${e}`} className="hover:text-white">{e}</a>
                ))}
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>{site.address.line2}</p>
        </div>
      </div>
    </footer>
  );
}
