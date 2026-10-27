import Image from "next/image";
import Link from "next/link";
import type { AirlineBrand } from "@/lib/airlines";

/**
 * Building blocks for the gridline job / event cards: an outer shell, an inner bordered panel with an optional
 * right-hand rail, ruled rows with a small caps label on the left, and cells split by vertical gridlines.
 */

export function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <li className="relative rounded-2xl border border-line bg-white p-1.5 transition hover:border-ink/15 hover:shadow-[0_8px_24px_-16px_rgba(24,24,27,0.25)]">
      {children}
    </li>
  );
}

/** Card title that links to the detail view; its ::after stretches over the whole card so any click opens it. */
export function CardTitle({ href, children }: { href?: string; children: React.ReactNode }) {
  const className = "text-[14px] leading-snug font-semibold text-ink";
  if (!href) return <h3 className={className}>{children}</h3>;
  return (
    <h3 className={className}>
      <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline">
        {children}
      </Link>
    </h3>
  );
}

/** Inner panel: main column plus a rail that sits to the right on wide screens and below on phones. */
export function CardPanel({ children, rail, tint }: { children: React.ReactNode; rail?: React.ReactNode; tint?: string }) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-line sm:grid-cols-[minmax(0,1fr)_10.5rem]">
      <div
        className="min-w-0"
        style={tint ? { background: `linear-gradient(180deg, color-mix(in srgb, ${tint} 6%, white) 0%, white 96px)` } : undefined}
      >
        {children}
      </div>
      {/* Phones: the rail is a single row under the panel; wider screens: a centred column on the right */}
      {rail && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-3 sm:flex-col sm:flex-nowrap sm:items-stretch sm:justify-center sm:gap-2 sm:border-t-0 sm:border-l sm:px-5 sm:py-4">
          {rail}
        </div>
      )}
    </div>
  );
}

/** One ruled row: label column, then content. */
export function GridRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 border-t border-line sm:grid-cols-[9rem_minmax(0,1fr)]">
      <p className="px-4 pt-3 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase sm:py-3.5 sm:pl-5">{label}</p>
      <div className="min-w-0 px-4 py-3 sm:pl-0">{children}</div>
    </div>
  );
}

/** Cells inside a GridRow, separated by vertical gridlines (stacked with horizontal rules on phones). */
export function GridCells({ cells }: { cells: { label: string; value: React.ReactNode }[] }) {
  return (
    <div
      className="-my-3 grid divide-y divide-line sm:[grid-template-columns:repeat(var(--cells),minmax(0,1fr))] sm:divide-x sm:divide-y-0"
      style={{ "--cells": cells.length } as React.CSSProperties}
    >
      {cells.map((cell, i) => (
        // Phones: "Label ……… value" on one line per cell; wider screens: label above value
        <div key={cell.label} className={`flex min-w-0 items-center justify-between gap-3 py-2.5 sm:block sm:py-3 ${i === 0 ? "sm:pr-4" : "sm:px-4"}`}>
          <p className="shrink-0 text-[11.5px] text-muted">{cell.label}</p>
          <div className="truncate text-[12.5px] font-medium text-ink sm:mt-1">{cell.value}</div>
        </div>
      ))}
    </div>
  );
}

/** Airline logo, or a brand-coloured IATA-code tile when we have no logo file. */
export function BrandLogo({ brand }: { brand: AirlineBrand }) {
  if (brand.logo) {
    return (
      <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl border border-line bg-white p-2 shadow-[0_1px_2px_rgba(24,24,27,0.06)]">
        <Image src={brand.logo} alt={brand.name} width={80} height={48} className="max-h-full w-auto object-contain" />
      </span>
    );
  }
  return (
    <span
      className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl text-sm font-bold tracking-wider text-white shadow-[0_1px_2px_rgba(24,24,27,0.12)]"
      style={{ background: `linear-gradient(135deg, ${brand.color}, color-mix(in srgb, ${brand.color} 70%, black))` }}
      aria-label={brand.name}
    >
      {brand.code}
    </span>
  );
}

/** Footer strip under the panel: status on the left, actions on the right. */
export function CardFooter({ status, children }: { status: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
      {status}
      {/* Above the card's stretched title link, so these buttons keep working */}
      <div className="relative z-10 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
