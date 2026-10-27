import type { Metadata } from "next";
import Image from "next/image";
import { BadgeIndianRupee, CheckCircle2, FileCheck2, Home, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import { Accent, HeroAccent, ButtonLink, CtaBand, FaqList, PageHero, SectionHeading } from "@/components/ui";
import { admissionSteps, documents, eligibility, faqs, site, telHref, whatsappHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Admissions & FAQs",
  description:
    "Eligibility, admission process, documents, fees and FAQs for cabin crew, ground operations, hospitality and retail courses at Millennium Air Hostess Academy, Patna.",
};

export default function AdmissionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title={
          <>
            Five steps to <HeroAccent>your first flight.</HeroAccent>
          </>
        }
        text="A simple, transparent admission process. Start with a free counselling session — we'll help you pick the right program for your goals."
      />

      {/* Process — sticky heading with scrolling steps */}
      <section className="container-x grid gap-12 py-20 lg:grid-cols-[1fr_1.3fr] lg:py-28">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            eyebrow="Admission process"
            title={
              <>
                How it <Accent>works.</Accent>
              </>
            }
            text="Most students complete the process within a week. Bring your documents to the counselling session to speed things up."
          />
          <div className="mt-8">
            <ButtonLink href="/contact#enquire">Book free counselling</ButtonLink>
          </div>
        </div>
        <ol className="relative space-y-5 before:absolute before:top-4 before:bottom-4 before:left-[1.6rem] before:w-px before:bg-line">
          {admissionSteps.map((s, i) => (
            <li key={s.title} className="group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6 sm:pr-4">
              {/* photo: a wide banner on phones, a thumbnail on the right from sm up */}
              <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-2xl bg-mist sm:order-last sm:aspect-[4/3] sm:w-36">
                <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 640px) 144px, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="flex min-w-0 flex-1 items-start gap-4 px-2 pb-2 sm:items-center sm:gap-6 sm:p-0">
                <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-muted">{s.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-mist py-20 lg:py-24">
        <div className="container-x grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-8 lg:col-span-2">
            <h2 className="text-2xl font-semibold tracking-tight">Eligibility criteria</h2>
            <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
              {eligibility.map((e) => (
                <div key={e.label} className="border-b border-line py-4">
                  <dt className="text-sm text-muted">{e.label}</dt>
                  <dd className="mt-1 font-medium">{e.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm text-muted">
              Physical criteria apply mainly to cabin crew roles. Our counsellors will guide you on specific airline
              requirements.
            </p>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-8">
              <FileCheck2 className="size-6 text-brand" />
              <h3 className="mt-4 text-lg font-semibold">Documents required</h3>
              <ul className="mt-4 space-y-2.5">
                {documents.map((d) => (
                  <li key={d} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-ink p-8 text-white">
              <BadgeIndianRupee className="size-6 text-brand" />
              <h3 className="mt-4 text-lg font-semibold">Fees & financing</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Flexible instalments, scholarships for deserving students and education loans with easy EMI.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-8">
              <Home className="size-6 text-brand" />
              <h3 className="mt-4 text-lg font-semibold">Hostel facility</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Optional, with 24/7 CCTV and separate accommodation for girls and boys.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="container-x grid gap-12 py-20 lg:grid-cols-[1fr_1.4fr] lg:py-28">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            eyebrow="FAQ"
            title={
              <>
                Frequently asked <Accent>questions.</Accent>
              </>
            }
            text="Can't find your answer? Call or WhatsApp us — we're happy to help."
          />
          <div className="mt-8 rounded-3xl border border-line bg-white p-6 sm:p-8">
            <h3 className="text-lg font-semibold">Still have questions?</h3>
            <p className="mt-1 text-sm text-muted">Talk to a counsellor — {site.hours}.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={telHref(site.phones[0])}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
              >
                <Phone className="size-4" /> Call {site.phones[0]}
              </a>
              <a
                href={whatsappHref("Hi! I have a question about admissions.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                <WhatsAppIcon className="size-4" /> WhatsApp us
              </a>
            </div>
          </div>
        </div>
        <FaqList items={faqs} />
      </section>

      <CtaBand />
    </>
  );
}
