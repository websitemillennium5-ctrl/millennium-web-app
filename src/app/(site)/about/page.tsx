import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  BadgeIndianRupee,
  Building2,
  Clock,
  GraduationCap,
  HeartHandshake,
  MapPin,
  MessagesSquare,
  Phone,
  Plane,
  PlaneTakeoff,
  ShieldCheck,
  Sparkles,
  Target,
  Telescope,
  Users,
} from "lucide-react";
import { Accent, HeroAccent, CtaBand, PageHero, PartnerGrid, SectionHeading } from "@/components/ui";
import { advantages, courses, media, site, stats, telHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Millennium Air Hostess Academy is Bihar's oldest and most respected aviation and hospitality training institute, based on Boring Road, Patna.",
};

const advantageIcons = [Award, Users, Plane, Sparkles, BadgeIndianRupee, ShieldCheck];

// The student journey, from first visit to first job (same story as the home page flight)
const journey = [
  { icon: MessagesSquare, title: "Counselling & enrolment", text: "A free one-on-one session and demo class. Any stream can apply after 12th — no experience needed." },
  { icon: GraduationCap, title: "Train with the experts", text: "Ex-airline mentors teach in-flight and ground operations, safety and emergency drills." },
  { icon: Sparkles, title: "Grooming & confidence", text: "Grooming, English communication and personality sessions that change how you carry yourself." },
  { icon: HeartHandshake, title: "Interview-ready", text: "Mock interviews, group discussions and resume building, then placement drives with recruiters." },
  { icon: PlaneTakeoff, title: "Your first flight", text: "Join 450+ alumni now working with airlines, airports and hotel brands." },
];

const facilities = [
  { title: "Real-world training spaces", text: "Practice in settings that replicate cabin, airport and hotel working environments." },
  { title: "Small batches", text: "Personal mentoring, so every student gets attention and feedback." },
  { title: "Safe hostel", text: "Optional accommodation with 24/7 CCTV and separate facilities for girls and boys." },
  { title: "Scholarships & easy EMI", text: "Scholarships and loan facilities keep quality training within reach." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={
          <>
            Shaping confident professionals <HeroAccent>since day one.</HeroAccent>
          </>
        }
        text="When you picture a career that takes you around the globe, introduces you to new cultures and surrounds you with the elegance of aviation and hospitality — you're picturing the dream that fuels Millennium."
        image={{ src: "/images/cabin-crew.jpg", alt: "Cabin crew in uniform walking across the airport apron" }}
      />

      <section className="container-x grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-28">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-mist">
            <Image src="/images/namaste.jpg" alt="Millennium student greeting with a namaste" fill sizes="25vw" className="object-cover" />
          </div>
          <div className="relative mt-12 aspect-[3/4] overflow-hidden rounded-3xl bg-mist">
            <Image src="/images/academy-team.jpg" alt="Students in uniform in front of an aircraft" fill sizes="25vw" className="object-cover" />
          </div>
        </div>
        <div>
          <SectionHeading
            eyebrow="Our story"
            title={
              <>
                Bihar&apos;s oldest aviation &amp; <Accent>hospitality academy.</Accent>
              </>
            }
          />
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
            <p>
              As Bihar&apos;s oldest and most respected aviation and hospitality training institute, we have been at the
              forefront of shaping ambitious students into confident, capable professionals.
            </p>
            <p>
              In just the past three years, our efforts have resulted in over 450 successful placements with leading
              airlines and hospitality brands — an achievement that reflects not just our training quality, but our
              commitment to each student&apos;s journey.
            </p>
            <p>
              We believe true training goes beyond classrooms. It&apos;s about transforming personalities, instilling
              confidence, and preparing you to shine — no matter the challenge, no matter the destination.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-mist py-20 lg:py-24">
        <div className="container-x grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-10">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Target className="size-5" />
            </span>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight">Our mission</h3>
            <p className="mt-3 text-lg leading-relaxed text-muted">
              To make world-class aviation and hospitality training accessible to every ambitious student in Bihar — and
              to stand beside them until they land their first job.
            </p>
          </div>
          <div className="rounded-3xl bg-ink p-10 text-white">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
              <Telescope className="size-5" />
            </span>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight">Our vision</h3>
            <p className="mt-3 text-lg leading-relaxed text-white/70">
              To be eastern India&apos;s most trusted launchpad for careers in the skies, known for the confidence,
              character and professionalism of our alumni.
            </p>
          </div>
        </div>
        <div className="container-x mt-6 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-8">
              <p className="text-4xl font-semibold tracking-tight">{s.value}</p>
              <p className="mt-2 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-20 lg:py-28">
        <SectionHeading
          eyebrow="Why Millennium"
          title={
            <>
              What makes us <Accent>different.</Accent>
            </>
          }
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {advantages.map((a, i) => {
            const Icon = advantageIcons[i];
            return (
              <div key={a.title} className="rounded-3xl border border-line p-7">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-6 text-lg font-semibold">{a.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{a.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How we train: the five-step journey */}
      <section className="bg-ink py-20 text-white lg:py-28">
        <div className="container-x">
          <SectionHeading
            light
            eyebrow="How we train"
            title={
              <>
                From your first visit to <Accent>your first flight.</Accent>
              </>
            }
          />
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {journey.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-brand text-white">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-serif text-3xl text-white/25 italic">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Programmes */}
      <section className="container-x py-20 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Our programmes"
            title={
              <>
                Four paths into <Accent>aviation & hospitality.</Accent>
              </>
            }
          />
          <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
            Compare all courses <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <Link key={c.slug} href={`/courses/${c.slug}`} className="group overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_rgba(11,18,32,0.35)]">
              <div className="relative aspect-[4/3] overflow-hidden bg-mist">
                <Image src={c.image} alt={c.title} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink backdrop-blur">{c.duration}</span>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">{c.category}</p>
                <h3 className="mt-2 flex items-start justify-between gap-2 text-lg leading-snug font-semibold">
                  {c.title}
                  <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted transition group-hover:text-ink" />
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hiring partners */}
      <section className="bg-mist py-20 lg:py-24">
        <div className="container-x">
          <SectionHeading
            align="center"
            eyebrow="Hiring partners"
            title={
              <>
                Where our students <Accent>build careers.</Accent>
              </>
            }
            text="Airlines, airports and hotel brands that recruit Millennium students."
          />
          <div className="mt-12">
            <PartnerGrid />
          </div>
        </div>
      </section>

      {/* Campus & visit */}
      <section className="container-x grid gap-10 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div>
          <SectionHeading
            eyebrow="Our campus"
            title={
              <>
                Come see where <Accent>it all begins.</Accent>
              </>
            }
            text="Our academy is on Boring Road in the heart of Patna. Drop in for free counselling and a demo class — no appointment needed."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {facilities.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line p-5">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-line bg-white">
          <iframe
            src={site.address.mapsEmbed}
            title={`Map to ${site.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-64 w-full border-0 grayscale-[30%] lg:h-80"
          />
          <ul className="divide-y divide-line">
            <li className="flex gap-3 p-5">
              <MapPin className="mt-0.5 size-5 shrink-0 text-brand" />
              <span>
                <span className="block font-semibold">{site.address.line1}</span>
                <span className="text-sm text-muted">{site.address.line2}</span>
                <a href={site.address.mapsUrl} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-semibold text-brand hover:underline">
                  Get directions
                </a>
              </span>
            </li>
            <li className="flex items-center gap-3 p-5">
              <Clock className="size-5 shrink-0 text-brand" />
              <span className="text-sm">{site.hours}</span>
            </li>
            <li className="flex items-center gap-3 p-5">
              <Phone className="size-5 shrink-0 text-brand" />
              <a href={telHref(site.phones[0])} className="text-sm font-semibold hover:text-brand">
                {site.phones[0]}
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* Press */}
      <section className="container-x border-t border-line py-16">
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

      <CtaBand />
    </>
  );
}
