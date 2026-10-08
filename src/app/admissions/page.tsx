import type { Metadata } from "next";
import { BadgeIndianRupee, CheckCircle2, FileCheck2, Home } from "lucide-react";
import { Accent, HeroAccent, ButtonLink, CtaBand, FaqList, PageHero, SectionHeading } from "@/components/ui";
import { admissionSteps, documents, eligibility, faqs } from "@/lib/site";

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
            <li key={s.title} className="relative flex gap-6 rounded-3xl border border-line bg-white p-6">
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-muted">{s.text}</p>
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
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Frequently asked <Accent>questions.</Accent>
            </>
          }
          text="Can't find your answer? Call or WhatsApp us — we're happy to help."
        />
        <FaqList items={faqs} />
      </section>

      <CtaBand />
    </>
  );
}
