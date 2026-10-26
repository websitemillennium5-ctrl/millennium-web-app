import Link from "next/link";
import { BadgeCheck, Megaphone, Pin, PinOff, Trash2, UsersRound } from "lucide-react";
import { createAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth";
import type { Announcement } from "@/lib/data";
import { courseStyle } from "@/lib/course-style";
import { courseTitle, formatDate } from "@/lib/format";
import { courses } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { CourseIcon } from "@/components/portal/course-icon";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/portal/form";
import { initials } from "@/components/portal/student-card";
import { Card, CourseSelect, Field, Input, PageTitle, Textarea } from "@/components/portal/ui";

const DAY = 86_400_000;
const requestTime = () => Date.now();
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

type Post = Announcement & { author: { full_name: string; role: string } | null };

/** Feed-style timestamps: "now", "5m", "3h", "2d", then "17 Oct". */
function postedAgo(iso: string, now: number) {
  const mins = Math.floor((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  if (mins < 7 * 1440) return `${Math.floor(mins / 1440)}d`;
  return shortDate.format(new Date(iso));
}

const action = "relative z-10 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted transition disabled:opacity-60";

function PostCard({ a, now, reach }: { a: Post; now: number; reach: number }) {
  const style = courseStyle(a.course_slug);
  const name = a.author?.full_name || "Millennium Academy";
  const role = a.author ? (a.author.role === "admin" ? "Admin" : "Staff") : "Front office";

  return (
    <li className="group px-4 pt-3 pb-2 transition hover:bg-mist/40">
      {a.pinned && (
        <p className="mb-1.5 ml-[3.25rem] flex items-center gap-1.5 text-[11px] font-semibold text-muted">
          <Pin className="size-3" /> Pinned announcement
        </p>
      )}
      <div className="flex gap-3">
        <span className="relative size-10 shrink-0">
          <span className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-xs font-bold text-white">
            {a.author ? initials(name) : "M"}
          </span>
          {/* Audience badge on the avatar, like a story ring */}
          <span
            className="absolute -right-0.5 -bottom-0.5 flex size-[18px] items-center justify-center rounded-full text-white ring-2 ring-white"
            style={{ background: a.course_slug ? style.color : "var(--color-ink)" }}
            title={a.course_slug ? courseTitle(a.course_slug) : "All students"}
          >
            {a.course_slug ? <CourseIcon course={a.course_slug} className="size-2.5" /> : <Megaphone className="size-2.5" strokeWidth={2} />}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="truncate font-semibold text-ink">{name}</span>
            <BadgeCheck className="size-3.5 shrink-0 fill-sky-500 text-white" aria-label="Verified staff" />
            <span className="truncate text-muted">
              {role} · <time dateTime={a.created_at} title={formatDate(a.created_at)}>{postedAgo(a.created_at, now)}</time>
            </span>
          </div>
          <p className="text-xs text-muted">
            To{" "}
            <span className={a.course_slug ? `font-medium ${style.iconClass}` : "font-medium text-ink-soft"}>
              {a.course_slug ? courseTitle(a.course_slug) : "All students"}
            </span>
          </p>

          <h3 className="mt-2 text-[14px] leading-snug font-semibold text-ink">{a.title}</h3>
          {a.body && <p className="mt-1 text-[13.5px] leading-relaxed whitespace-pre-line text-ink-soft">{a.body}</p>}

          {/* Action bar */}
          <div className="mt-2 -ml-2 flex items-center justify-between gap-2">
            <span className={`${action} cursor-default`} title="Students who can see this">
              <UsersRound className="size-3.5" strokeWidth={1.75} />
              <span className="tabular-nums">{reach}</span> {reach === 1 ? "student" : "students"}
            </span>
            <div className="flex items-center gap-1">
              <form action={toggleAnnouncementPin}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="pinned" value={String(a.pinned)} />
                <button className={`${action} ${a.pinned ? "text-amber-700 hover:bg-amber-50" : "hover:bg-amber-50 hover:text-amber-700"}`}>
                  {a.pinned ? <PinOff className="size-3.5" strokeWidth={1.75} /> : <Pin className="size-3.5" strokeWidth={1.75} />}
                  {a.pinned ? "Unpin" : "Pin"}
                </button>
              </form>
              <form action={deleteAnnouncement}>
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton message="Delete this announcement?" className={`${action} hover:bg-red-50 hover:text-red-600`}>
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default async function AdminAnnouncements({ searchParams }: PageProps<"/admin/announcements">) {
  const me = await requireStaff();
  const { to } = await searchParams;
  const audience = typeof to === "string" ? to : "";
  const supabase = await createClient();
  const [{ data }, { data: students }] = await Promise.all([
    supabase
      .from("announcements")
      .select("*, author:profiles!announcements_created_by_fkey(full_name, role)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("course_slug").eq("role", "student"),
  ]);
  const all = (data ?? []).map((a) => ({ ...a, author: Array.isArray(a.author) ? a.author[0] : a.author })) as Post[];
  const now = requestTime();
  const studentRows = students ?? [];
  const reach = (slug: string | null) => (slug ? studentRows.filter((s) => s.course_slug === slug).length : studentRows.length);

  const shown = all.filter((a) => !audience || (audience === "everyone" ? !a.course_slug : a.course_slug === audience));

  const tabs = [
    { key: "", label: "All", count: all.length },
    { key: "everyone", label: "All students", count: all.filter((a) => !a.course_slug).length },
    ...courses.map((c) => ({ key: c.slug, label: c.title, count: all.filter((a) => a.course_slug === c.slug).length })),
  ].filter((t) => t.key === "" || t.count > 0 || t.key === audience);

  const stats = [
    { label: "Posted", value: all.length },
    { label: "Pinned", value: all.filter((a) => a.pinned).length },
    { label: "This week", value: all.filter((a) => now - Date.parse(a.created_at) < 7 * DAY).length },
  ];

  return (
    <>
      <PageTitle title="Announcements" text="Notices appear on students' dashboards straight away." />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-0">
          <Card title="New announcement">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-[11px] font-bold text-white">
                {initials(me.full_name || me.email || "")}
              </span>
              <span className="text-xs text-muted">
                Posting as <span className="font-medium text-ink">{me.full_name || me.email}</span>
              </span>
            </div>
            <ActionForm action={createAnnouncement} resetOnSuccess className="space-y-3.5">
              <Field label="Title *">
                <Input name="title" required maxLength={120} placeholder="Mock interview on Friday" />
              </Field>
              <Field label="Message">
                <Textarea name="body" rows={4} placeholder="Details, timings, what to bring…" />
              </Field>
              <Field label="Who should see it?">
                <CourseSelect emptyLabel="All students" />
              </Field>
              <label className="flex items-center gap-2 rounded-xl border border-line bg-mist/50 px-3 py-2 text-sm text-ink-soft">
                <input type="checkbox" name="pinned" className="size-4 accent-brand" />
                <span>
                  Pin to top <span className="text-xs text-muted">— stays above newer notices</span>
                </span>
              </label>
              <SubmitButton>Post announcement</SubmitButton>
            </ActionForm>
          </Card>

          <div className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-white">
            {stats.map((s) => (
              <div key={s.label} className="px-3 py-2.5 text-center">
                <p className="text-base font-semibold tabular-nums text-ink">{s.value}</p>
                <p className="text-[11px] text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white lg:max-w-2xl">
          {/* Feed header with audience tabs */}
          <nav className="scrollbar-none flex overflow-x-auto border-b border-line" aria-label="Audience">
            {tabs.map((t) => {
              const active = audience === t.key;
              return (
                <Link
                  key={t.key || "all"}
                  href={t.key ? `/admin/announcements?to=${t.key}` : "/admin/announcements"}
                  scroll={false}
                  aria-current={active || undefined}
                  className={`relative inline-flex shrink-0 items-center gap-1.5 px-4 py-3 text-[12.5px] transition hover:bg-mist/60 ${
                    active ? "font-semibold text-ink" : "text-muted"
                  }`}
                >
                  {t.label}
                  <span className="text-[11px] tabular-nums text-muted">{t.count}</span>
                  {active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-accent" />}
                </Link>
              );
            })}
          </nav>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-mist text-muted">
                <Megaphone className="size-5" strokeWidth={1.5} />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">{all.length ? "Nothing for this audience" : "No announcements yet"}</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                {all.length ? "Pick another tab, or post one using the form." : "Post your first notice — it shows up on students' dashboards right away."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((a) => (
                <PostCard key={a.id} a={a} now={now} reach={reach(a.course_slug)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
