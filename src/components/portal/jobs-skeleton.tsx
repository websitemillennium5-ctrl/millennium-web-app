/**
 * Skeletons for the public jobs board, shown by its loading.tsx files so navigation paints instantly
 * (Next prefetches them) while the listings load. Shapes mirror the real filters, cards and detail view.
 */

export function JobsBoardHeading() {
  return <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Find your next job, free and updated daily</h1>;
}

// Default corner radius only when the caller doesn't set one (two rounded-* classes would fight)
export const Bone = ({ className = "" }: { className?: string }) => (
  <div className={`animate-shimmer bg-mist ${className.includes("rounded") ? "" : "rounded-md"} ${className}`} />
);

function CardSkeleton() {
  return (
    <li className="rounded-2xl border border-line bg-white p-1.5">
      <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-line sm:grid-cols-[minmax(0,1fr)_10.5rem]">
        <div>
          <div className="flex items-start gap-4 p-4 sm:px-5">
            <Bone className="h-12 w-20 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2 pt-1">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-1/3" />
              <Bone className="h-3 w-1/2" />
            </div>
          </div>
          {[0, 1].map((row) => (
            <div key={row} className="grid grid-cols-1 gap-3 border-t border-line px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:pl-5">
              <Bone className="h-3 w-20" />
              <div className="space-y-2">
                <Bone className="h-3 w-full" />
                <Bone className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-3 sm:flex-col sm:items-stretch sm:justify-center sm:border-t-0 sm:border-l sm:px-5">
          <Bone className="h-7 w-16" />
          <Bone className="h-3 w-20" />
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <Bone className="h-6 w-24 rounded-full" />
        <Bone className="h-9 w-28 rounded-full" />
      </div>
    </li>
  );
}

/** Placeholder job cards, shown in place of the results while a filter change loads. */
export function JobCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading jobs" className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </ul>
  );
}

export function JobsBoardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading jobs" className="portal container-x pt-28 pb-12 lg:pt-36 lg:pb-16">
      <JobsBoardHeading />
      <div className="mx-auto mb-8 flex max-w-2xl flex-col items-center gap-4">
        <Bone className="h-14 w-full rounded-full" />
        <div className="flex gap-1.5">
          {["w-24", "w-28", "w-32", "w-28"].map((w, i) => (
            <Bone key={i} className={`h-9 rounded-full ${w}`} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <div className="hidden space-y-2 rounded-2xl border border-line bg-white p-3 lg:block">
          <Bone className="h-3 w-20" />
          <Bone className="h-8 w-full rounded-full" />
          <Bone className="h-8 w-full rounded-full" />
          <Bone className="mt-4 h-3 w-16" />
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1">
              <Bone className="h-5 w-8 rounded" />
              <Bone className="h-3 flex-1" />
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <Bone className="mb-4 h-4 w-56" />
          <JobCardsSkeleton />
        </div>
      </div>
    </section>
  );
}

export function ListingDetailSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading listing" className="portal container-x pt-32 pb-16 lg:pt-40">
      <Bone className="mb-4 h-4 w-44" />
      <div className="rounded-2xl border border-line bg-white p-1.5">
        <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-line sm:grid-cols-[minmax(0,1fr)_10.5rem]">
          <div>
            <div className="flex items-start gap-4 p-5 sm:px-6 sm:py-6">
              <Bone className="h-12 w-20 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2.5 pt-1">
                <Bone className="h-6 w-2/3" />
                <Bone className="h-3.5 w-1/3" />
                <Bone className="h-3.5 w-1/2" />
              </div>
            </div>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="grid grid-cols-1 gap-3 border-t border-line px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:pl-5">
                <Bone className="h-3 w-20" />
                <div className="space-y-2">
                  <Bone className="h-3 w-full" />
                  <Bone className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-line px-4 py-3 sm:flex-col sm:items-stretch sm:justify-center sm:border-t-0 sm:border-l sm:px-5">
            <Bone className="h-8 w-16" />
            <Bone className="h-3 w-20" />
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <Bone className="h-4 w-32" />
          <Bone className="h-9 w-32 rounded-full" />
        </div>
      </div>
    </section>
  );
}
