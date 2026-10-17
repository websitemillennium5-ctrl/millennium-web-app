import type { Metadata } from "next";
import { HeroAccent, CourseCard, CtaBand, PageHero } from "@/components/ui";
import { courses } from "@/lib/site";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Certification courses in Aviation Cabin Crew, Airport Ground Operations, Hospitality and Retail Operations at Millennium Air Hostess Academy, Patna.",
};

export default function CoursesPage() {
  return (
    <>
      <PageHero
        eyebrow="Our programs"
        title={
          <>
            Careers with <HeroAccent>altitude.</HeroAccent>
          </>
        }
        text="Four career-focused certification programs, 6–12 months each, open to students from any stream after 12th. Every program includes grooming, communication training and 100% placement assistance."
      />
      <section className="container-x py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
