import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, Clock, GraduationCap, Plane, Plus } from "lucide-react";
import type { Course } from "@/lib/site";
import { faqs as allFaqs, partners, placedStudents, testimonials } from "@/lib/site";

export function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase ${
        light ? "text-white/70" : "text-brand"
      }`}
    >
      <span className={`h-px w-6 ${light ? "bg-white/50" : "bg-brand"}`} />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = "left",
  light,
}: {
  eyebrow: string;
  title: React.ReactNode;
  text?: string;
  align?: "left" | "center";
  light?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-4 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl ${
          light ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {text && <p className={`mt-5 text-lg leading-relaxed ${light ? "text-white/70" : "text-muted"}`}>{text}</p>}
    </div>
  );
}

/** Brand-colored accent for section headlines */
export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-brand">{children}</span>;
}

/** Serif italic accent, reserved for hero headlines */
export function HeroAccent({ children }: { children: React.ReactNode }) {
  return <em className="font-serif font-normal text-brand italic">{children}</em>;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "light";
}) {
  const styles = {
    primary: "bg-brand text-white shadow-lg shadow-brand/25 hover:bg-brand-dark",
    secondary: "border border-line bg-white text-ink hover:border-ink",
    light: "bg-white text-ink hover:bg-white/90",
  }[variant];
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition ${styles}`}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function PageHero({
  eyebrow,
  title,
  text,
  image,
}: {
  eyebrow: string;
  title: React.ReactNode;
  text: string;
  image?: { src: string; alt: string };
}) {
  return (
    <section className="relative overflow-hidden bg-sky">
      <div className="pointer-events-none absolute -top-40 -right-40 size-[32rem] rounded-full bg-brand/10 blur-3xl" />
      <div
        className={`container-x relative pt-32 pb-16 lg:pt-44 lg:pb-24 ${
          image ? "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]" : ""
        }`}
      >
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{text}</p>
        </div>
        {image && (
          <div className="relative">
            <div className="relative aspect-[6/5] overflow-hidden rounded-[2rem] bg-mist shadow-2xl shadow-ink/10">
              <Image src={image.src} alt={image.alt} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
            </div>
            {/* Boarding-pass badge */}
            <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl shadow-ink/10 sm:-left-6">
              <span className="grid size-10 place-items-center rounded-full bg-brand/10 text-brand">
                <Plane className="size-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted">Next destination</p>
                <p className="text-sm font-semibold">Your career in the skies</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-mist">
        <Image
          src={course.image}
          alt={course.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold backdrop-blur">
          {course.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-medium text-muted">Certification course</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight">{course.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{course.summary}</p>
        <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted">
            <Clock className="size-4" />
            {course.duration}
          </span>
          <span className="flex size-9 items-center justify-center rounded-full bg-mist transition group-hover:bg-brand group-hover:text-white">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

const hospitalityPartners = new Set(["Taj Hotels", "Marriott", "ITC Hotels", "Radisson", "EaseMyTrip"]);

function PartnerLogo({
  partner,
  className = "",
  hidden,
}: {
  partner: (typeof partners)[number];
  className?: string;
  hidden?: boolean;
}) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className={`flex items-center justify-center rounded-2xl border border-line bg-white ${className}`}
      style={partner.bg ? { backgroundColor: partner.bg, borderColor: partner.bg } : undefined}
    >
      <Image
        src={partner.logo}
        alt={partner.name}
        width={160}
        height={64}
        className="max-h-full w-auto object-contain"
      />
    </div>
  );
}

function MarqueeRow({
  items,
  label,
  reverse,
}: {
  items: typeof partners;
  label: string;
  reverse?: boolean;
}) {
  const row = [...items, ...items];
  return (
    <div>
      <p className="container-x mb-2 flex items-center gap-4 text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
        {label}
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
      </p>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)]">
        <div
          className={`flex w-max gap-5 py-3 pr-5 hover:[animation-play-state:paused] ${
            reverse ? "animate-marquee-reverse" : "animate-marquee"
          }`}
        >
          {row.map((p, i) => (
            <PartnerLogo
              key={`${p.name}-${i}`}
              partner={p}
              className="h-24 w-48 shrink-0 px-7 py-5 shadow-[0_2px_8px_-2px_rgba(11,18,32,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(11,18,32,0.25)] sm:h-28 sm:w-56 sm:px-9 sm:py-6"
              hidden={i >= items.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Full-width hiring partners showcase: headline, quick stats and two scrolling logo rails */
export function PartnerShowcase() {
  const airlines = partners.filter((p) => !hospitalityPartners.has(p.name));
  const hospitality = partners.filter((p) => hospitalityPartners.has(p.name));
  const highlights = [
    { value: `${airlines.length}`, label: "Airlines hiring our students", icon: Plane },
    { value: `${hospitality.length}`, label: "Hotel & travel brands", icon: Building2 },
    { value: "450+", label: "Students placed in 3 years", icon: GraduationCap },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-white via-sky to-white py-24 lg:py-32">
      {/* Backdrop: fading dot grid and soft brand glows */}
      <div className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(rgba(11,18,32,0.09)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 size-[40rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-[28rem] rounded-full bg-[#7fb2ec]/20 blur-3xl" />

      <div className="container-x text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-brand uppercase shadow-sm backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand/60" />
            <span className="relative size-2 rounded-full bg-brand" />
          </span>
          Hiring partners
        </span>
        <h2 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Our students fly and work with <HeroAccent>{partners.length}+ brands.</HeroAccent>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          From India&apos;s busiest airlines to international carriers and luxury hotel chains, our alumni are
          building careers with the names you already know.
        </p>

        <dl className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
          {highlights.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/70 p-4 text-left shadow-[0_8px_24px_-16px_rgba(11,18,32,0.3)] ring-1 ring-ink/5 backdrop-blur"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <div>
                <dt className="sr-only">{label}</dt>
                <dd className="text-2xl leading-none font-semibold tracking-tight">{value}</dd>
                <dd className="mt-1 text-xs leading-snug text-muted">{label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-16 space-y-8 lg:mt-20">
        <MarqueeRow items={airlines} label="Airlines" />
        <MarqueeRow items={[...hospitality, ...hospitality]} label="Hotels & travel" reverse />
      </div>

      <div className="container-x mt-14 flex justify-center">
        <Link
          href="/placements"
          className="group inline-flex items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-6 text-sm font-semibold text-white transition hover:bg-brand"
        >
          See where our students work
          <span className="flex size-8 items-center justify-center rounded-full bg-white/15 transition duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </div>
    </section>
  );
}

export function PartnerGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {partners.map((p) => (
        <PartnerLogo key={p.name} partner={p} className="h-24 px-5 py-5" />
      ))}
    </div>
  );
}

/**
 * Student photo card that flips on hover (or keyboard focus) to reveal the student's
 * crew ID badge hanging from a lanyard in the airline's colours.
 */
/** Plain photo card on phones and tablets, the flipping 3D ID-badge card from lg up.
    The hidden variant's lazy images aren't fetched, so mobile only loads one photo per student. */
export function StudentCard({ student }: { student: (typeof placedStudents)[number] }) {
  return (
    <>
      <div className="lg:hidden">
        <StudentCardPlain student={student} />
      </div>
      <div className="hidden lg:block">
        <StudentCard3D student={student} />
      </div>
    </>
  );
}

function StudentCardPlain({ student }: { student: (typeof placedStudents)[number] }) {
  const partner = partners.find((p) => p.name === student.company);
  return (
    <figure className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-ink ring-1 ring-ink/5">
      <Image src={student.photo} alt="" fill sizes="50vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 via-45% to-transparent" />
      {partner && (
        <span
          className="absolute top-3 left-3 flex h-8 items-center rounded-lg bg-white px-2.5 shadow-sm"
          style={partner.bg ? { backgroundColor: partner.bg } : undefined}
        >
          <Image src={partner.logo} alt={partner.name} width={64} height={24} className="max-h-5 w-auto object-contain" />
        </span>
      )}
      <figcaption className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="text-base font-semibold tracking-tight">{student.name}</p>
        <p className="mt-1 text-xs text-white/75">
          {student.role} <span className="text-white/40">at</span>{" "}
          <span className="font-medium text-white">{student.company}</span>
        </p>
      </figcaption>
    </figure>
  );
}

function StudentCard3D({ student }: { student: (typeof placedStudents)[number] }) {
  const partner = partners.find((p) => p.name === student.company);
  const brand = partner?.brand ?? "#0b1220";
  const idNumber = `MLN-${String(placedStudents.indexOf(student) + 1).padStart(4, "0")}`;
  const face = "absolute inset-0 overflow-hidden rounded-3xl [backface-visibility:hidden]";

  return (
    <div
      tabIndex={0}
      aria-label={`${student.name}, ${student.role} at ${student.company}`}
      className="group relative aspect-[4/5] rounded-3xl [perspective:1400px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
    >
      <div className="relative size-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)] motion-reduce:duration-0">
        {/* Front: photo */}
        <figure className={`${face} bg-ink shadow-[0_1px_2px_rgba(11,18,32,0.06)] ring-1 ring-ink/5`}>
          <Image
            src={student.photo}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 via-45% to-transparent" />

          <div className="absolute inset-x-4 top-4 flex items-start justify-between">
            {partner && (
              <span
                className="flex h-10 items-center rounded-xl bg-white px-3 shadow-sm"
                style={partner.bg ? { backgroundColor: partner.bg } : undefined}
              >
                <Image src={partner.logo} alt={partner.name} width={80} height={32} className="max-h-6 w-auto object-contain" />
              </span>
            )}
            <span className="hidden items-center gap-1.5 rounded-full bg-ink/45 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/25 sm:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Placed
            </span>
          </div>

          <figcaption className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
            <p className="text-base font-semibold tracking-tight sm:text-xl">{student.name}</p>
            <p className="mt-1 text-xs text-white/75 sm:text-sm">
              {student.role} <span className="text-white/40">at</span>{" "}
              <span className="font-medium text-white">{student.company}</span>
            </p>
          </figcaption>
        </figure>

        {/* Back: hanging ID badge */}
        <div
          aria-hidden
          className={`${face} invisible @container bg-gradient-to-b from-mist to-sky ring-1 ring-line [transform:rotateY(180deg)] transition-[visibility] delay-500 group-hover:visible group-hover:delay-0 group-focus-visible:visible group-focus-visible:delay-0`}
        >
          <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(11,18,32,0.07)_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Everything below swings from the top edge, like a lanyard on a hook */}
          <div className="absolute inset-0 origin-top group-hover:animate-[badge-swing_1.6s_ease-out_0.25s_both] group-focus-visible:animate-[badge-swing_1.6s_ease-out_0.25s_both]">
            {/* Lanyard strap */}
            <div
              className="absolute top-0 left-1/2 h-[17%] w-[9%] -translate-x-1/2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              style={{ backgroundColor: brand }}
            >
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/30" />
            </div>
            {/* Metal clip */}
            <div className="absolute top-[15.5%] left-1/2 h-[4.5%] w-[13%] -translate-x-1/2 rounded-md bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-300 shadow-sm ring-1 ring-black/10" />

            {/* Badge */}
            <div className="absolute inset-x-[12%] top-[19%] bottom-[5%] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_40px_-16px_rgba(11,18,32,0.45)] ring-1 ring-black/5">
              <div className="relative flex h-[22%] shrink-0 items-center justify-between px-[7%]" style={{ backgroundColor: brand }}>
                <span className="absolute top-1.5 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-black/25" />
                {partner && (
                  <span className="flex h-[60%] items-center rounded-md bg-white px-2" style={partner.bg ? { backgroundColor: partner.bg } : undefined}>
                    <Image src={partner.logo} alt="" width={80} height={32} className="max-h-[70%] w-auto object-contain" />
                  </span>
                )}
                <span className="hidden text-[10px] font-semibold tracking-[0.2em] text-white/80 uppercase @[15rem]:inline">
                  Crew ID
                </span>
              </div>

              <div className="flex flex-1 flex-col items-center px-[7%] pt-[6%] pb-[5%] text-center">
                <div className="relative aspect-[4/5] w-[34%] shrink-0 overflow-hidden rounded-xl ring-4 ring-white shadow-md">
                  <Image src={student.photo} alt="" fill sizes="140px" className="object-cover object-[50%_30%]" />
                </div>
                <p className="mt-[5%] text-sm leading-tight font-semibold tracking-tight text-ink @[15rem]:text-lg">
                  {student.name}
                </p>
                <p className="mt-0.5 text-[11px] font-medium @[15rem]:text-sm" style={{ color: brand }}>
                  {student.role}
                </p>

                <dl className="mt-auto hidden w-full grid-cols-2 gap-2 border-t border-dashed border-line pt-[5%] text-left @[15rem]:grid">
                  <div>
                    <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">Airline</dt>
                    <dd className="mt-0.5 truncate text-xs font-semibold text-ink">{student.company}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">Alumni no.</dt>
                    <dd className="mt-0.5 font-mono text-xs font-semibold text-ink">{idNumber}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex w-full items-center justify-between gap-3 pt-[5%] @[15rem]:mt-[5%]">
                  <span className="h-5 flex-1 opacity-80 [background-image:repeating-linear-gradient(90deg,#0b1220_0_2px,transparent_2px_4px,#0b1220_4px_5px,transparent_5px_8px,#0b1220_8px_11px,transparent_11px_12px)]" />
                  <span className="text-[9px] leading-tight font-semibold tracking-wide text-muted uppercase">
                    Trained at
                    <br />
                    <span className="text-brand">Millennium</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const avatarGradients = [
  "from-rose-400 to-brand",
  "from-sky-400 to-indigo-600",
  "from-amber-300 to-orange-500",
  "from-emerald-300 to-teal-600",
  "from-fuchsia-400 to-purple-600",
];

/** Student photo, or a gradient initials avatar until a photo is added */
export function Avatar({ person, className = "size-11" }: { person: (typeof testimonials)[number]; className?: string }) {
  if (person.photo) {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-full ring-2 ring-white ${className}`}>
        <Image src={person.photo} alt={person.name} fill sizes="96px" className="object-cover" />
      </span>
    );
  }
  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  const hash = [...person.name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const gradient = avatarGradients[hash % avatarGradients.length];
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white ${gradient} ${className}`}
    >
      {initials}
    </span>
  );
}

const noteStyles = [
  { paper: "#fff3a6", tilt: "-rotate-2", fastener: "pin" },
  { paper: "#ffd9e2", tilt: "rotate-[1.5deg]", fastener: "tape" },
  { paper: "#d6ecff", tilt: "-rotate-1", fastener: "pin" },
  { paper: "#dcf5d3", tilt: "rotate-2", fastener: "tape" },
  { paper: "#ffe2c4", tilt: "-rotate-[1.5deg]", fastener: "tape" },
  { paper: "#e7ddff", tilt: "rotate-1", fastener: "pin" },
] as const;

/** Testimonials pinned to a board as sticky notes; hovering straightens and lifts a note */
export function TestimonialGrid({ limit }: { limit?: number }) {
  const items = limit ? testimonials.slice(0, limit) : testimonials;
  return (
    <ul className="grid gap-x-8 gap-y-12 pt-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10">
      {items.map((t, i) => {
        const note = noteStyles[i % noteStyles.length];
        return (
          <li key={t.name} className={`group relative ${i % 3 === 1 ? "lg:translate-y-8" : ""}`}>
            <figure
              className={`relative flex flex-col sm:min-h-[17rem] justify-between rounded-[3px] p-7 pt-10 shadow-[0_1px_1px_rgba(0,0,0,0.06),0_18px_28px_-18px_rgba(11,18,32,0.45)] transition duration-500 ease-out group-hover:z-10 group-hover:-translate-y-2 group-hover:rotate-0 group-hover:scale-[1.03] group-hover:shadow-[0_2px_2px_rgba(0,0,0,0.05),0_32px_48px_-20px_rgba(11,18,32,0.45)] ${note.tilt}`}
              style={{ backgroundColor: note.paper }}
            >
              {/* Fastener */}
              {note.fastener === "pin" ? (
                <span aria-hidden className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="block size-5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a8a,#e3182d_55%,#9e0c1c)] shadow-[0_3px_4px_rgba(0,0,0,0.35)]" />
                  <span className="absolute top-1/2 left-1/2 -z-10 h-3 w-1 translate-x-0.5 rotate-[30deg] rounded-full bg-black/15 blur-[1px]" />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="absolute -top-3 left-1/2 h-7 w-24 -translate-x-1/2 -rotate-3 bg-white/55 shadow-[0_1px_2px_rgba(0,0,0,0.08)] backdrop-blur-[1px] [mask-image:linear-gradient(90deg,transparent_0,black_4px,black_calc(100%-4px),transparent)]"
                />
              )}
              {/* Peeling corner */}
              <span
                aria-hidden
                className="absolute right-0 bottom-0 size-8 rounded-tl-[10px] bg-gradient-to-tl from-black/[0.07] via-black/[0.02] to-transparent"
              />

              <blockquote className="font-hand text-[1.7rem] leading-[1.15] font-medium text-ink">{t.quote}</blockquote>

              <figcaption className="mt-6 flex items-center gap-3 border-t border-dashed border-ink/15 pt-4">
                <Avatar person={t} className="size-10 text-xs ring-white/80" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{t.name}</span>
                  <span className="block truncate text-xs text-ink/60">
                    {t.role}
                    {t.company && <span className="font-semibold text-ink/80"> · {t.company}</span>}
                  </span>
                </span>
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}

export function FaqList({ items = allFaqs }: { items?: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-white">
      {items.map((f) => (
        <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-medium">
            {f.q}
            <Plus className="size-5 shrink-0 text-muted transition group-open:rotate-45 group-open:text-brand" />
          </summary>
          <p className="mt-3 pr-10 leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand() {
  return (
    <section className="container-x py-20 lg:py-28">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 sm:px-12 lg:px-16 lg:py-20">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-sky/10 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              <GraduationCap className="size-4" /> Admissions open for the new batch
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Your career in the skies <span className="text-white/80">starts here.</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg text-white/70">
              Book a free counselling session and demo class. Scholarships and easy EMI options available.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <ButtonLink href="/contact#enquire">Book free counselling</ButtonLink>
            <ButtonLink href="/courses" variant="light">
              Explore courses
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
