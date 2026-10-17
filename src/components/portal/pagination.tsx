import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers to show: always first and last, the current page ±1, and "…" for the gaps. */
function pageList(page: number, pageCount: number): (number | "…")[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["…" as const, p] : [p]));
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  href,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  href: (page: number) => string;
}) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const arrow = "flex size-9 items-center justify-center rounded-full border border-line text-ink-soft transition";

  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        Showing <span className="font-medium text-ink">{first.toLocaleString("en-IN")}</span>–
        <span className="font-medium text-ink">{last.toLocaleString("en-IN")}</span> of{" "}
        <span className="font-medium text-ink">{total.toLocaleString("en-IN")}</span>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={href(page - 1)} className={`${arrow} hover:border-ink/25 hover:bg-mist hover:text-ink`} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span className={`${arrow} opacity-40`} aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
          )}
          {pageList(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1.5 text-sm text-muted">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={href(p)}
                aria-current={p === page ? "page" : undefined}
                className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-sm transition ${
                  p === page ? "bg-ink font-medium text-white" : "text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                {p}
              </Link>
            ),
          )}
          {page < pageCount ? (
            <Link href={href(page + 1)} className={`${arrow} hover:border-ink/25 hover:bg-mist hover:text-ink`} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className={`${arrow} opacity-40`} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
