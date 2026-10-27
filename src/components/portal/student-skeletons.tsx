import { Bone, JobCardsSkeleton } from "@/components/portal/jobs-skeleton";

/**
 * Student portal placeholders, shown by the loading.tsx files so a tap on the dock switches page instantly
 * (Next prefetches them) while the real page renders on the server. Shapes mirror each page's layout.
 */

function TitleSkeleton() {
  return (
    <div className="mb-5 space-y-2">
      <Bone className="h-5 w-36" />
      <Bone className="h-3 w-52" />
    </div>
  );
}

function BlockSkeleton({ className = "h-28" }: { className?: string }) {
  return <Bone className={`w-full rounded-2xl ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <TitleSkeleton />
      <BlockSkeleton className="h-72" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <BlockSkeleton key={i} className="h-32" />
        ))}
      </div>
      <BlockSkeleton className="mt-5 h-56" />
    </div>
  );
}

export function ListSkeleton({ rows = 4, rowClassName = "h-24" }: { rows?: number; rowClassName?: string }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <TitleSkeleton />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <BlockSkeleton key={i} className={rowClassName} />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <TitleSkeleton />
      <BlockSkeleton className="h-72" />
      <BlockSkeleton className="mt-5 h-20" />
      <BlockSkeleton className="mt-5 h-64" />
    </div>
  );
}

export function StudentJobsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading jobs">
      <TitleSkeleton />
      <Bone className="h-14 w-full rounded-full" />
      <div className="mt-4 flex gap-1.5 overflow-hidden">
        {["w-24", "w-28", "w-32"].map((w, i) => (
          <Bone key={i} className={`h-9 shrink-0 rounded-full ${w}`} />
        ))}
      </div>
      <Bone className="mt-6 mb-5 h-4 w-48" />
      <JobCardsSkeleton />
    </div>
  );
}
