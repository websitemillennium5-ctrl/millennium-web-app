import Link from "next/link";
import { BookOpen, Download, ExternalLink, Trash2, UsersRound } from "lucide-react";
import { deleteStudyMaterial } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth";
import type { StudyMaterial } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { formatBytes, studyKind } from "@/lib/study";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/portal/form";
import { StudyUploadForm } from "@/components/portal/study-upload-form";
import { Card, PageTitle } from "@/components/portal/ui";

const action = "relative inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted transition";

export default async function AdminStudy({ searchParams }: PageProps<"/admin/study">) {
  await requireStaff();
  const { to } = await searchParams;
  const audience = typeof to === "string" ? to : "";
  const supabase = await createClient();
  const [{ data }, { data: students }] = await Promise.all([
    supabase.from("study_materials").select("*").order("created_at", { ascending: false }).limit(300),
    supabase.from("profiles").select("batch").eq("role", "student"),
  ]);
  const all = (data ?? []) as StudyMaterial[];
  const studentBatches = (students ?? []).map((s) => s.batch?.trim()).filter((b): b is string => !!b);
  // batches known from student profiles plus any used on existing material, for the form's suggestions and the tabs
  const batches = [...new Set([...studentBatches, ...all.map((m) => m.batch).filter((b): b is string => !!b)])].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
  const reach = (batch: string | null) =>
    batch ? studentBatches.filter((b) => b.toLowerCase() === batch.toLowerCase()).length : (students ?? []).length;

  const shown = all.filter((m) => !audience || (audience === "everyone" ? !m.batch : m.batch?.toLowerCase() === audience.toLowerCase()));
  const tabs = [
    { key: "", label: "All", count: all.length },
    { key: "everyone", label: "All students", count: all.filter((m) => !m.batch).length },
    ...batches.map((b) => ({ key: b, label: `Batch ${b}`, count: all.filter((m) => m.batch?.toLowerCase() === b.toLowerCase()).length })),
  ].filter((t) => t.key === "" || t.count > 0 || t.key === audience);

  return (
    <>
      <PageTitle title="Study material" text="Notes, slides, videos and links for one batch or every student." />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-0">
          <Card title="Share material">
            <StudyUploadForm batches={batches} />
          </Card>
        </div>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white lg:max-w-2xl">
          <nav className="scrollbar-none flex overflow-x-auto border-b border-line" aria-label="Audience">
            {tabs.map((t) => {
              const active = audience === t.key;
              return (
                <Link
                  key={t.key || "all"}
                  href={t.key ? `/admin/study?to=${encodeURIComponent(t.key)}` : "/admin/study"}
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
                <BookOpen className="size-5" strokeWidth={1.5} />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">{all.length ? "Nothing for this audience" : "No study material yet"}</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                {all.length ? "Pick another tab, or share something using the form." : "Upload notes or add a link — students see it in their portal right away."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((m) => {
                const kind = studyKind(m);
                const Icon = kind.icon;
                const students = reach(m.batch);
                return (
                  <li key={m.id} className="flex gap-3 px-4 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: kind.color }}>
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] leading-snug font-semibold text-ink">{m.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {kind.label}
                        {m.file_size ? ` · ${formatBytes(m.file_size)}` : ""} · {formatDate(m.created_at)} · To{" "}
                        <span className="font-medium text-ink-soft">{m.batch ? `Batch ${m.batch}` : "All students"}</span>
                      </p>
                      {m.description && <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-ink-soft">{m.description}</p>}

                      <div className="mt-2 -ml-2 flex flex-wrap items-center justify-between gap-2">
                        <span className={`${action} cursor-default`} title="Students who can see this">
                          <UsersRound className="size-3.5" strokeWidth={1.75} />
                          <span className="tabular-nums">{students}</span> {students === 1 ? "student" : "students"}
                        </span>
                        <div className="flex items-center gap-1">
                          {m.file_path && (
                            <a href={`/student/study/${m.id}/file?download=1`} className={`${action} hover:bg-mist hover:text-ink`}>
                              <Download className="size-3.5" strokeWidth={1.75} /> Download
                            </a>
                          )}
                          <a
                            href={m.file_path ? `/student/study/${m.id}/file` : m.link_url!}
                            target="_blank"
                            rel="noreferrer"
                            className={`${action} hover:bg-mist hover:text-ink`}
                          >
                            <ExternalLink className="size-3.5" strokeWidth={1.75} /> Open
                          </a>
                          <form action={deleteStudyMaterial}>
                            <input type="hidden" name="id" value={m.id} />
                            <ConfirmButton message="Delete this study material? Students will lose access to it." className={`${action} hover:bg-red-50 hover:text-red-600`}>
                              <Trash2 className="size-3.5" strokeWidth={1.75} /> Delete
                            </ConfirmButton>
                          </form>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
