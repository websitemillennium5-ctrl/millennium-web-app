import type { Metadata } from "next";
import { FileText, Handshake, MessagesSquare, Plane } from "lucide-react";
import { Accent, HeroAccent, CtaBand, PageHero, PartnerGrid, SectionHeading, StudentCard, TestimonialGrid } from "@/components/ui";
import { placedStudents } from "@/lib/site";

export const metadata: Metadata = {
  title: "Placements",
  description:
    "450+ students placed in 3 years with IndiGo, Air India, Akasa Air, Emirates, Qatar Airways and top hotel brands. See where Millennium alumni work today.",
};

const support = [
  { icon: FileText, title: "Resume building", text: "Professional, airline-ready resumes and photo portfolios." },
  { icon: MessagesSquare, title: "Mock interviews", text: "Repeated GD and interview rounds modelled on real airline selections." },
  { icon: Handshake, title: "Placement drives", text: "Direct connections with airlines, airports and hotel brands." },
  { icon: Plane, title: "Career counselling", text: "Guidance toward the roles that best fit your profile and goals." },
];

export default function PlacementsPage() {
  return (
    <>
      <PageHero
        eyebrow="Placements"
        title={
          <>
            450+ students, <HeroAccent>now soaring.</HeroAccent>
          </>
        }
        text="In just three years, our students have started careers with India's leading airlines, international carriers and premium hotel brands. Here's where they are today."
      />

      <section className="container-x py-20">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
          {placedStudents.map((s) => (
            <StudentCard key={s.name} student={s} />
          ))}
        </div>
      </section>

      <section className="bg-mist py-20 lg:py-24">
        <div className="container-x">
          <SectionHeading
            eyebrow="Hiring partners"
            title={
              <>
                Where our alumni <Accent>fly &amp; work.</Accent>
              </>
            }
            text="Recognised by leading airlines and hospitality brands across India and the Middle East."
          />
          <div className="mt-12">
            <PartnerGrid />
          </div>
        </div>
      </section>

      <section className="container-x py-20 lg:py-24">
        <SectionHeading
          eyebrow="100% placement assistance"
          title={
            <>
              We&apos;re with you <Accent>until you land the job.</Accent>
            </>
          }
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {support.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl border border-line p-7">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-6 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-mist py-20 lg:py-24">
        <div className="container-x">
          <SectionHeading
            align="center"
            eyebrow="Student voices"
            title={
              <>
                In their <Accent>own words.</Accent>
              </>
            }
          />
          <div className="mt-12">
            <TestimonialGrid />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
