import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock, GraduationCap, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry-form";
import { CourseCard, CtaBand, Eyebrow, FaqList } from "@/components/ui";
import { courses, faqs, getCourse, site, telHref } from "@/lib/site";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return {};
  return {
    title: `Certification Course in ${course.title}`,
    description: course.summary,
    openGraph: { images: [course.image] },
  };
}

export default async function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const others = courses.filter((c) => c.slug !== course.slug).slice(0, 3);

  return (
    <>
      <section className="bg-sky">
        <div className="container-x grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink">
              <ArrowLeft className="size-4" /> All courses
            </Link>
            <div className="mt-6">
              <Eyebrow>Certification course · {course.category}</Eyebrow>
            </div>
            <h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">{course.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{course.summary}</p>
            <dl className="mt-8 grid max-w-lg grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="size-3.5" /> Duration
                </dt>
                <dd className="mt-1 font-semibold">{course.duration}</dd>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <GraduationCap className="size-3.5" /> Eligibility
                </dt>
                <dd className="mt-1 font-semibold">{course.eligibility}</dd>
              </div>
            </dl>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl shadow-ink/10">
            <Image src={course.image} alt={course.title} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section className="container-x grid gap-14 py-20 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">About the course</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">{course.description}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What you&apos;ll learn</h2>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2">
              {course.modules.map((m, i) => (
                <li key={m} className="flex gap-4 rounded-2xl border border-line p-5">
                  <span className="font-serif text-2xl leading-none text-brand italic">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-medium">{m}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl bg-mist p-7">
              <BriefcaseBusiness className="size-6 text-brand" />
              <h3 className="mt-4 text-lg font-semibold">Career roles</h3>
              <ul className="mt-4 space-y-2.5">
                {course.roles.map((r) => (
                  <li key={r} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-4 text-brand" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-ink p-7 text-white">
              <GraduationCap className="size-6 text-brand" />
              <h3 className="mt-4 text-lg font-semibold">Where alumni work</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.recruiters.map((r) => (
                  <span key={r} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Common questions</h2>
            <div className="mt-6">
              <FaqList items={faqs.slice(0, 5)} />
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div id="enquire" className="rounded-3xl border border-line bg-white p-7 shadow-xl shadow-ink/5">
            <h2 className="text-xl font-semibold">Enquire about this course</h2>
            <p className="mt-1 text-sm text-muted">Get fees, batch dates and a free counselling session.</p>
            <div className="mt-6">
              <EnquiryForm defaultCourse={course.title} />
            </div>
            <a
              href={telHref(site.phones[0])}
              className="mt-5 flex items-center justify-center gap-2 border-t border-line pt-5 text-sm font-semibold hover:text-brand"
            >
              <Phone className="size-4" /> Or call {site.phones[0]}
            </a>
          </div>
        </aside>
      </section>

      <section className="bg-mist py-20">
        <div className="container-x">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Explore other programs</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <CourseCard key={c.slug} course={c} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
