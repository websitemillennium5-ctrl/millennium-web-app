import type { ReactNode } from "react";
import { Bone, JobCardsSkeleton } from "@/components/portal/jobs-skeleton";

/**
 * Student portal placeholders, shown by the loading.tsx files so a tap on the dock switches page instantly
 * (Next prefetches them) while the real page renders on the server. Each one traces the real page's
 * layout — cards, tiles, rows — so the content fades in over the same shapes instead of replacing a
 * few grey slabs. Blocks drift in one after another (see animate-skeleton-in).
 */

type Props = { children?: ReactNode; className?: string; step?: number };

// A section that fades up; `step` staggers it after the ones above
function Reveal({ children, className = "", step = 0 }: Props) {
  return (
    <div className={`animate-skeleton-in ${className}`} style={{ animationDelay: `${step * 70}ms` }}>
      {children}
    </div>
  );
}

function Card({ children, className = "" }: Props) {
  return <div className={`rounded-2xl border border-line bg-white ${className}`}>{children}</div>;
}

function Lines({ widths, className = "" }: { widths: string[]; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {widths.map((w, i) => (
        <Bone key={i} className={`h-3 ${w}`} />
      ))}
    </div>
  );
}

function TitleSkeleton({ eyebrow = false }: { eyebrow?: boolean }) {
  return (
    <Reveal className="mb-5 space-y-2">
      {eyebrow ? (
        <>
          <Bone className="h-2.5 w-24" />
          <Bone className="h-5 w-44" />
        </>
      ) : (
        <>
          <Bone className="h-5 w-36" />
          <Bone className="h-3 w-56 max-w-full" />
        </>
      )}
    </Reveal>
  );
}

// Section heading row: label on the left, "See all" on the right
function SectionHead() {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <Bone className="h-3.5 w-32" />
      <Bone className="h-3 w-14" />
    </div>
  );
}

function StatTile() {
  return (
    <Card className="p-3.5">
      <div className="flex items-center justify-between">
        <Bone className="size-8 rounded-xl" />
        <Bone className="size-6 rounded-full" />
      </div>
      <Bone className="mt-3 h-6 w-14" />
      <Bone className="mt-2 h-3 w-20" />
      <Bone className="mt-2 h-1 w-full rounded-full" />
      <Bone className="mt-2 h-2.5 w-24" />
    </Card>
  );
}

function JobRow() {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <Bone className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <Bone className="h-3.5 w-3/4" />
        <Bone className="mt-2 h-3 w-1/2" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Bone className="h-5 w-14 rounded-full" />
        <Bone className="h-2.5 w-10" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <TitleSkeleton eyebrow />

      {/* Today's notice */}
      <Reveal step={1}>
        <Card className="flex items-start gap-3 p-3.5">
          <Bone className="size-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Bone className="h-2.5 w-28" />
            <Bone className="mt-2 h-3.5 w-2/3" />
            <Bone className="mt-2 h-3 w-full" />
          </div>
        </Card>
      </Reveal>

      {/* Stat tiles */}
      <Reveal step={2} className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <StatTile key={i} />
        ))}
      </Reveal>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Upcoming events */}
        <Reveal step={3}>
          <SectionHead />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <Card key={i} className="flex flex-col p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <Bone className="h-10 w-10 rounded-xl" />
                  <Bone className="h-5 w-12 rounded-full" />
                </div>
                <Bone className="mt-3 h-3.5 w-full" />
                <Bone className="mt-2 h-3.5 w-2/3" />
                <div className="mt-3 flex gap-1.5">
                  <Bone className="h-5 w-14 rounded-full" />
                  <Bone className="h-5 w-16 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        </Reveal>

        {/* Latest openings */}
        <Reveal step={4}>
          <SectionHead />
          <Card className="divide-y divide-line/70 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <JobRow key={i} />
            ))}
          </Card>
        </Reveal>
      </div>
    </div>
  );
}

export function AnnouncementsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading announcements">
      <TitleSkeleton />
      {[3, 2].map((count, g) => (
        <Reveal key={g} step={g + 1} className={g ? "mt-6" : ""}>
          <Bone className="mb-3 ml-1 h-2.5 w-20" />
          <Card className="divide-y divide-line/70 overflow-hidden">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex gap-3 px-4 py-4">
                <Bone className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <Bone className="h-3 w-28" />
                    <Bone className="h-2.5 w-12" />
                  </div>
                  <Bone className="mt-3 h-4 w-3/4" />
                  <Lines className="mt-2.5" widths={["w-full", "w-5/6"]} />
                </div>
              </div>
            ))}
          </Card>
        </Reveal>
      ))}
    </div>
  );
}

export function StudySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading study material">
      <TitleSkeleton />
      {[2, 2].map((count, g) => (
        <Reveal key={g} step={g + 1} className={g ? "mt-6" : ""}>
          <Bone className="mb-2.5 h-2.5 w-24" />
          <div className="space-y-3">
            {Array.from({ length: count }, (_, i) => (
              <Card key={i} className="p-3.5">
                <div className="flex gap-3">
                  <Bone className="size-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Bone className="h-3.5 w-2/3" />
                    <Bone className="mt-2 h-2.5 w-1/3" />
                    <Lines className="mt-3" widths={["w-full", "w-4/5"]} />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Bone className="h-8 w-24 rounded-full" />
                  <Bone className="h-8 w-20 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function FeesSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading fees">
      <TitleSkeleton />

      {/* Balance card with the ring, amount and progress, then the three-up strip */}
      <Reveal step={1}>
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <Bone className="size-24 rounded-full" />
            <div>
              <Bone className="h-2.5 w-20" />
              <Bone className="mt-2.5 h-7 w-36" />
              <Bone className="mt-2 h-3 w-3/4" />
              <Bone className="mt-4 h-2 w-full rounded-full" />
              <div className="mt-2 flex justify-between">
                <Bone className="h-2.5 w-16" />
                <Bone className="h-2.5 w-16" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line bg-mist/40">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-3">
                <Bone className="h-2.5 w-12" />
                <Bone className="mt-2 h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_18rem]">
        {/* Payment timeline */}
        <Reveal step={2}>
          <Card className="p-5">
            <Bone className="h-3.5 w-32" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Bone className="mt-0.5 size-7 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <Bone className="h-3.5 w-24" />
                      <Bone className="h-3.5 w-16" />
                    </div>
                    <Bone className="mt-2 h-2.5 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        {/* How to pay */}
        <Reveal step={3}>
          <Card className="p-5">
            <Bone className="h-3.5 w-24" />
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-2.5">
                  <Bone className="size-4 shrink-0" />
                  <Lines className="flex-1" widths={["w-full", "w-2/3"]} />
                </div>
              ))}
            </div>
            <Bone className="mt-4 h-9 w-full rounded-full" />
          </Card>
        </Reveal>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile">
      <TitleSkeleton />

      {/* Boarding pass */}
      <Reveal step={1}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-dashed border-line px-5 py-3">
            <Bone className="h-3 w-24" />
            <Bone className="h-3 w-16" />
          </div>
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-[auto_1fr]">
            <Bone className="size-20 rounded-2xl" />
            <div>
              <Bone className="h-5 w-48 max-w-full" />
              <Bone className="mt-2 h-3 w-32" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <Bone className="h-2.5 w-12" />
                    <Bone className="mt-1.5 h-3.5 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <Bone className="h-1.5 w-full rounded-full" />
            <Bone className="mt-2 h-2.5 w-40" />
          </div>
        </Card>
      </Reveal>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_20rem]">
        {/* Details list */}
        <Reveal step={2}>
          <Card className="divide-y divide-line/70 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Bone className="size-4 shrink-0" />
                <Bone className="h-3 w-24" />
                <Bone className="ml-auto h-3 w-32" />
              </div>
            ))}
          </Card>
        </Reveal>

        {/* Change password */}
        <Reveal step={3}>
          <Card className="p-5">
            <Bone className="h-3.5 w-32" />
            <Bone className="mt-3 h-8 w-full rounded-xl" />
            <div className="mt-3.5 space-y-3.5">
              {[0, 1, 2].map((i) => (
                <Bone key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
            <Bone className="mt-4 h-9 w-full rounded-full" />
          </Card>
        </Reveal>
      </div>
    </div>
  );
}

export function StudentJobsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading jobs">
      <TitleSkeleton />
      <Reveal step={1}>
        <Bone className="h-14 w-full rounded-full" />
        <div className="mt-4 flex gap-1.5 overflow-hidden">
          {["w-24", "w-28", "w-32"].map((w, i) => (
            <Bone key={i} className={`h-9 shrink-0 rounded-full ${w}`} />
          ))}
        </div>
      </Reveal>
      <Reveal step={2}>
        <Bone className="mt-6 mb-5 h-4 w-48" />
        <JobCardsSkeleton />
      </Reveal>
    </div>
  );
}
