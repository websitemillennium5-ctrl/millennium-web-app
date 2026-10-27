import Image from "next/image";
import { BadgeCheck, GraduationCap, Megaphone, Pin } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getAnnouncements, type Announcement } from "@/lib/data";
import { courseTitle, formatDate } from "@/lib/format";
import { PageTitle } from "@/components/portal/ui";

const DAY = 86_400_000;
const requestTime = () => Date.now();
const istDay = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(t);

function ago(iso: string, now: number) {
  const mins = Math.floor((now - Date.parse(iso)) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  if (mins < 7 * 1440) return `${Math.floor(mins / 1440)}d ago`;
  return formatDate(iso);
}

/** Pinned first, then Today / This week / Earlier by India date */
function group(announcements: Announcement[], now: number) {
  const today = istDay(now);
  const weekAgo = istDay(now - 6 * DAY);
  const groups: { label: string; items: Announcement[] }[] = [
    { label: "Pinned", items: [] },
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const a of announcements) {
    const day = istDay(Date.parse(a.created_at));
    groups[a.pinned ? 0 : day === today ? 1 : day >= weekAgo ? 2 : 3].items.push(a);
  }
  return groups.filter((g) => g.items.length > 0);
}

function AnnouncementCard({ a, now }: { a: Announcement; now: number }) {
  const isNew = now - Date.parse(a.created_at) < 2 * DAY;
  return (
    <li className={`relative flex gap-3 px-4 py-4 ${a.pinned ? "bg-amber-50/60" : ""}`}>
      {/* avatar, with an unread dot while the notice is new */}
      <span className="relative h-fit shrink-0">
        <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-line">
          <Image src="/images/logo-mark.png" alt="" width={80} height={80} className="size-full scale-[1.35] object-contain" />
        </span>
        {isNew && !a.pinned && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-[#c42d39] ring-2 ring-white" />}
      </span>

      <div className="min-w-0 flex-1">
        {/* post header: name + verified, then handle · time */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[13px] leading-tight font-semibold text-ink">
              Millennium
              <BadgeCheck className="size-3.5 shrink-0 fill-sky-500 text-white" />
            </p>
            <p className="mt-0.5 truncate text-[11.5px] leading-tight text-muted">
              @millenniumairhostess ·{" "}
              <time dateTime={a.created_at} title={formatDate(a.created_at)}>
                {ago(a.created_at, now)}
              </time>
            </p>
          </div>
          {a.pinned ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] leading-none font-semibold text-amber-800">
              <Pin className="size-3 fill-current" /> Pinned
            </span>
          ) : (
            isNew && (
              <span className="shrink-0 rounded-full bg-[#a7222d]/[0.08] px-2 py-1 text-[10px] leading-none font-semibold tracking-wide text-[#a7222d] uppercase">New</span>
            )
          )}
        </div>

        <h2 className="mt-2.5 text-[15px] leading-snug font-semibold text-ink">{a.title}</h2>
        {a.body && <p className="mt-1 text-[13.5px] leading-relaxed whitespace-pre-line text-ink-soft">{a.body}</p>}
        {a.course_slug && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-[11px] font-medium text-ink-soft">
            <GraduationCap className="size-3.5 text-muted" /> For {courseTitle(a.course_slug)}
          </p>
        )}
      </div>
    </li>
  );
}

export default async function StudentAnnouncements() {
  await requireStudent();
  const now = requestTime();
  const announcements = await getAnnouncements(100);

  return (
    <>
      <PageTitle title="Announcements" text="Class updates and notices from the Millennium team." />

      {announcements.length === 0 ? (
        <section className="flex flex-col items-center rounded-2xl border border-line bg-white px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mist text-muted">
            <Megaphone className="size-6" strokeWidth={1.5} />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">No announcements yet</p>
          <p className="mt-1 text-xs text-muted">Class updates and notices will show up here.</p>
        </section>
      ) : (
        <div className="space-y-6">
          {group(announcements, now).map((g) => (
            <section key={g.label}>
              <h2 className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                {g.label}
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1.5 text-[10px] tracking-normal text-ink-soft tabular-nums ring-1 ring-ink/[0.06]">
                  {g.items.length}
                </span>
                <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
              </h2>
              <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-white">
                {g.items.map((a) => (
                  <AnnouncementCard key={a.id} a={a} now={now} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
