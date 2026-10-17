import Image from "next/image";
import { FlightStory } from "@/components/flight/flight-story";
import { CourseStack } from "@/components/course-stack";
import { AboutSlideshow } from "@/components/about-slideshow";
import { AdvantageList } from "@/components/advantage-list";
import { FindJobsButton } from "@/components/floating-actions";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  Plane,
} from "lucide-react";
import {
  Accent,
  ButtonLink,
  CtaBand,
  Eyebrow,
  FaqList,
  HeroAccent,
  PartnerShowcase,
  SectionHeading,
  StudentCard,
  TestimonialGrid,
} from "@/components/ui";
import { faqs, media, partners, placedStudents, stats } from "@/lib/site";

const aboutFeatures = [
  { title: "Ex-airline mentors", text: "Learn from crew who have flown the routes." },
  { title: "Grooming & personality", text: "Poise, presence and English communication." },
  { title: "Mock interviews & drills", text: "Rehearse every round before the real one." },
  { title: "Scholarships & EMI", text: "Fees that fit your family's budget." },
];

export default function Home() {
  return (
    <>
      <FindJobsButton />
      <FlightStory />

      {/* Hiring partners */}
      <PartnerShowcase />

      {/* About — bento */}
      <section className="bg-mist py-24 lg:py-32">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <Eyebrow>About Millennium</Eyebrow>
              <h2 className="mt-4 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                Training that goes <HeroAccent>beyond the classroom.</HeroAccent>
              </h2>
            </div>
            <div className="max-w-md lg:pb-1">
              <p className="leading-relaxed text-muted">
                As Bihar&apos;s oldest aviation and hospitality institute, we transform personalities, build
                confidence and prepare you to shine — no matter the destination.
              </p>
              <Link
                href="/about"
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-5 text-sm font-semibold text-white transition hover:bg-brand"
              >
                More about us
                <span className="flex size-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:auto-rows-[16rem] lg:grid-cols-4">
            {/* Photo loop */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-ink sm:col-span-2 lg:row-span-2 lg:aspect-auto">
              <AboutSlideshow />
              <span className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-md">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-400/70" />
                  <span className="relative size-2 rounded-full bg-red-500" />
                </span>
                Inside the academy
              </span>
            </div>

            {/* Placements stat */}
            <div className="relative flex flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-brand p-7 text-white">
              <Plane className="absolute -top-4 -right-4 size-32 rotate-12 text-white/10" strokeWidth={1.25} />
              <p className="text-sm font-medium text-white/80">Students placed</p>
              <div>
                <p className="text-6xl font-semibold tracking-tight">450+</p>
                <p className="mt-2 text-sm text-white/80">in airlines, airports and hotels over the last 3 years.</p>
              </div>
            </div>

            {/* Partners stat */}
            <div className="flex flex-col justify-between gap-8 rounded-3xl bg-white p-7 ring-1 ring-line">
              <div className="flex -space-x-3">
                {partners.slice(0, 4).map((p) => (
                  <span
                    key={p.name}
                    className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-white p-2 ring-2 ring-white shadow-[0_2px_8px_-2px_rgba(11,18,32,0.15)]"
                    style={p.bg ? { backgroundColor: p.bg } : undefined}
                  >
                    <Image src={p.logo} alt={p.name} width={48} height={48} className="max-h-full w-auto object-contain" />
                  </span>
                ))}
                <span className="flex size-12 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white ring-2 ring-white">
                  +{partners.length - 4}
                </span>
              </div>
              <div>
                <p className="text-6xl font-semibold tracking-tight">{partners.length}+</p>
                <p className="mt-2 text-sm text-muted">Airline &amp; hospitality hiring partners.</p>
              </div>
            </div>

            {/* What sets us apart */}
            <div className="rounded-3xl bg-white p-7 ring-1 ring-line sm:col-span-2">
              <p className="text-sm font-medium text-muted">What sets us apart</p>
              <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {aboutFeatures.map(({ title, text }) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <div>
                      <p className="font-semibold tracking-tight">{title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="bg-mist pt-20 pb-14 lg:pt-28 lg:pb-16">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeading
              eyebrow="Our programs"
              title={
                <>
                  Careers with <Accent>altitude.</Accent>
                </>
              }
              text="Specialised, career-focused certification programs for the most in-demand roles in aviation, hospitality and retail."
            />
            <Link href="/courses" className="group inline-flex items-center gap-2 font-semibold text-ink hover:text-brand">
              View all courses <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
      <CourseStack />

      {/* Stats */}
      <section className="container-x py-20 lg:py-24">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-8">
              <p className="text-5xl font-semibold tracking-tight">
                {s.value}
                {s.value === "6–12" && <span className="ml-1 text-lg font-medium text-muted">mo</span>}
              </p>
              <p className="mt-3 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Advantage */}
      <section className="relative isolate overflow-hidden bg-ink py-24 text-white lg:py-32">
        <div className="pointer-events-none absolute -top-40 -left-40 -z-10 size-[36rem] rounded-full bg-brand/15 blur-[120px]" />
        <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <Eyebrow light>The Millennium advantage</Eyebrow>
              <h2 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
                From career dream to <HeroAccent>career reality.</HeroAccent>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-white/60">
                Six reasons students across Bihar choose Millennium to launch careers in aviation and hospitality.
              </p>
              <dl className="mt-10 grid max-w-sm grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10">
                {[
                  ["450+", "Students placed"],
                  [`${partners.length}+`, "Hiring partners"],
                ].map(([value, label]) => (
                  <div key={label} className="flex flex-col-reverse bg-ink p-5">
                    <dt className="mt-1 text-sm text-white/50">{label}</dt>
                    <dd className="text-3xl font-semibold tracking-tight">{value}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/contact#enquire"
                className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white py-2 pr-2 pl-6 text-sm font-semibold text-ink transition hover:bg-brand hover:text-white"
              >
                Book free counselling
                <span className="flex size-8 items-center justify-center rounded-full bg-ink text-white transition group-hover:translate-x-0.5 group-hover:bg-white group-hover:text-brand">
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7">
            <AdvantageList />
          </div>
        </div>
      </section>

      {/* Placed students */}
      <section className="container-x py-20 lg:py-28">
        <SectionHeading
          eyebrow="Success stories"
          title={
            <>
              Where our students are <Accent>soaring today.</Accent>
            </>
          }
        />
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
          {placedStudents.map((s) => (
            <StudentCard key={s.name} student={s} />
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Link
            href="/placements"
            className="group inline-flex items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-6 text-sm font-semibold text-white transition hover:bg-brand"
          >
            See all placements
            <span className="flex size-8 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-mist bg-[radial-gradient(rgba(11,18,32,0.08)_1px,transparent_1px)] bg-[size:20px_20px] py-20 lg:py-28">
        <div className="container-x">
          <SectionHeading
            align="center"
            eyebrow="Student voices"
            title={
              <>
                Hear it from <Accent>our alumni.</Accent>
              </>
            }
            text="Real students. Real careers."
          />
          <div className="mt-16 lg:mt-20">
            <TestimonialGrid limit={6} />
          </div>
        </div>
      </section>

      {/* Media */}
      <section className="container-x py-16">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <div className="flex items-center gap-3 text-sm font-medium text-muted">
            <Building2 className="size-5" /> As featured in
          </div>
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4 lg:w-auto">
            {media.map((m) => (
              <div key={m.name} className="flex h-14 items-center justify-center px-4 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
                <Image src={m.logo} alt={m.name} width={180} height={45} className="max-h-10 w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-x grid gap-12 border-t border-line py-20 lg:grid-cols-[1fr_1.4fr] lg:py-28">
        <div>
          <SectionHeading
            eyebrow="FAQ"
            title={
              <>
                Questions, <Accent>answered.</Accent>
              </>
            }
            text="Everything you need to know before you begin. Can't find what you're looking for? We're a call away."
          />
          <div className="mt-8">
            <Eyebrow>Still unsure?</Eyebrow>
            <div className="mt-4">
              <ButtonLink href="/contact">Talk to a counsellor</ButtonLink>
            </div>
          </div>
        </div>
        <FaqList items={faqs.slice(0, 6)} />
      </section>

      <CtaBand />
    </>
  );
}
