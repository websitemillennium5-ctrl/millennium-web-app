import { Bone } from "@/components/portal/jobs-skeleton";

/**
 * Staff portal placeholder, shown by (portal)/loading.tsx so a sidebar click switches page instantly
 * (Next prefetches it) while the real page renders on the server. Mirrors the common page shape:
 * title, a row of stat tiles, a search/filter bar and a table.
 */
export function AdminPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-5 space-y-2">
        <Bone className="h-5 w-40" />
        <Bone className="h-3 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <Bone className="mt-5 h-36 w-full rounded-2xl" />
      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        <Bone className="h-11 w-full rounded-none" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 border-t border-line px-4 py-3.5">
            <Bone className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3 w-40" />
              <Bone className="h-2.5 w-24" />
            </div>
            <Bone className="hidden h-3 w-28 sm:block" />
            <Bone className="hidden h-7 w-24 rounded-full md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
