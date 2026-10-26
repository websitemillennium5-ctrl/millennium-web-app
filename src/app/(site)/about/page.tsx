import type { Metadata } from "next";
import Image from "next/image";
import { Award, BadgeIndianRupee, Plane, ShieldCheck, Sparkles, Target, Telescope, Users } from "lucide-react";
import { Accent, HeroAccent, CtaBand, PageHero, SectionHeading } from "@/components/ui";
import { advantages, stats } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Millennium Air Hostess Academy is Bihar's oldest and most respected aviation and hospitality training institute, based on Boring Road, Patna.",
};

const advantageIcons = [Award, Users, Plane, Sparkles, BadgeIndianRupee, ShieldCheck];

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

      <CtaBand />
    </>
  );
}
