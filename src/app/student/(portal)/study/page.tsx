import { BookOpen, Download, ExternalLink, UsersRound } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getStudyMaterials, type StudyMaterial } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { formatBytes, studyKind } from "@/lib/study";
import { PageTitle } from "@/components/portal/ui";

const DAY = 86_400_000;
const requestTime = () => Date.now();

function MaterialCard({ m, now }: { m: StudyMaterial; now: number }) {
  const kind = studyKind(m);
  const Icon = kind.icon;
  const isNew = now - Date.parse(m.created_at) < 3 * DAY;
  const href = m.file_path ? `/student/study/${m.id}/file` : m.link_url!;

  return (
    <li className="rounded-2xl border border-line bg-white p-3.5">
      <div className="flex gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${kind.color} 12%, white)`, color: kind.color }}>
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[14px] leading-snug font-semibold text-ink">{m.title}</h3>
            {isNew && <span className="shrink-0 rounded-full bg-[#a7222d] px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">New</span>}
          </div>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {kind.label}
            {m.file_size ? ` · ${formatBytes(m.file_size)}` : ""} · {formatDate(m.created_at)}
          </p>
          {m.description && <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed whitespace-pre-line text-ink-soft">{m.description}</p>}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink text-[12.5px] font-semibold text-white transition hover:bg-ink-soft active:scale-[0.98]"
        >
          <ExternalLink className="size-3.5" /> {m.file_path ? "Open" : "Open link"}
        </a>
        {m.file_path && (
          <a
            href={`${href}?download=1`}
            aria-label={`Download ${m.file_name ?? m.title}`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-[12.5px] font-semibold text-ink-soft transition hover:border-ink/20 hover:text-ink active:scale-[0.98]"
          >
            <Download className="size-3.5" /> Save
          </a>
        )}
      </div>
    </li>
  );
}

export default async function StudentStudy() {
  const profile = await requireStudent();
  const now = requestTime();
  const materials = await getStudyMaterials();
  const forBatch = materials.filter((m) => m.batch);
  const forAll = materials.filter((m) => !m.batch);
  const groups = [
    { label: profile.batch ? `For batch ${profile.batch}` : "For your batch", items: forBatch, icon: UsersRound },
    { label: "For all students", items: forAll, icon: BookOpen },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <PageTitle title="Study material" />

      {materials.length === 0 ? (
        <section className="flex flex-col items-center rounded-2xl border border-line bg-white px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mist text-muted">
            <BookOpen className="size-6" strokeWidth={1.5} />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">Nothing here yet</p>
          <p className="mt-1 text-xs text-muted">Notes and videos your trainers share will show up here.</p>
        </section>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                <g.icon className="size-3.5" />
                {g.label}
                <span className="rounded-full bg-mist px-1.5 py-px text-[10px] tracking-normal tabular-nums">{g.items.length}</span>
              </h2>
              <ul className="space-y-3">
                {g.items.map((m) => (
                  <MaterialCard key={m.id} m={m} now={now} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
