import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry-form";
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from "@/components/icons";
import { HeroAccent, PageHero } from "@/components/ui";
import { site, telHref, whatsappHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Visit or call Millennium Air Hostess Academy, ${site.address.line1}, ${site.address.line2}. Book a free counselling session today.`,
};

export default function ContactPage() {
  const cards = [
    {
      icon: Phone,
      label: "Call us",
      lines: site.phones.map((p) => ({ text: p, href: telHref(p) })),
    },
    {
      icon: Mail,
      label: "Email",
      lines: site.emails.map((e) => ({ text: e, href: `mailto:${e}` })),
    },
    {
      icon: MapPin,
      label: "Visit the campus",
      lines: [{ text: `${site.address.line1}, ${site.address.line2}`, href: site.address.mapsUrl }],
    },
    {
      icon: Clock,
      label: "Office hours",
      lines: [{ text: site.hours }],
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Let&apos;s plan your <HeroAccent>take-off.</HeroAccent>
          </>
        }
        text="Book a free counselling session, ask about fees and batches, or just say hello. We usually reply within a few hours."
      />

      <section className="container-x grid gap-10 py-20 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {cards.map(({ icon: Icon, label, lines }) => (
            <div key={label} className="flex gap-5 rounded-3xl border border-line p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted">{label}</p>
                {lines.map((l) =>
                  "href" in l && l.href ? (
                    <a
                      key={l.text}
                      href={l.href}
                      target={l.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="mt-1 block font-semibold break-words hover:text-brand"
                    >
                      {l.text}
                    </a>
                  ) : (
                    <p key={l.text} className="mt-1 font-semibold">
                      {l.text}
                    </p>
                  ),
                )}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <a href={whatsappHref()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white">
              <WhatsAppIcon className="size-4" /> WhatsApp
            </a>
            <a href={site.social.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold hover:border-ink">
              <InstagramIcon className="size-4" /> Instagram
            </a>
            <a href={site.social.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold hover:border-ink">
              <FacebookIcon className="size-4" /> Facebook
            </a>
          </div>
        </div>

        <div id="enquire" className="scroll-mt-28 rounded-[2rem] border border-line bg-white p-7 shadow-xl shadow-ink/5 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Quick enquiry</h2>
          <p className="mt-1 text-muted">Your dream career is just one step away.</p>
          <div className="mt-8">
            <EnquiryForm />
          </div>
        </div>
      </section>

      <section className="container-x pb-24">
        <div className="overflow-hidden rounded-[2rem] border border-line">
          <iframe
            title="Map to Millennium Air Hostess Academy"
            src={site.address.mapsEmbed}
            className="h-[420px] w-full grayscale-[0.3]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}
