import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/* Small server-rendered charts for the staff overview. Plain HTML/SVG with CSS hover tooltips, so no chart library
   and no client JS. Marks carry colour; values and labels stay in ink/muted text. */

export type Point = { label: string; value: number; display?: string };

function Tooltip({ children, align = "center" }: { children: React.ReactNode; align?: "start" | "center" | "end" }) {
  const pos = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" }[align];
  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 ${pos}`}
    >
      {children}
    </span>
  );
}

/** Vertical columns over time. `every` thins the x-axis labels when there are many columns. */
export function ColumnChart({
  data,
  height = 176,
  every = 1,
  highlightLast = false,
  tone = "accent",
}: {
  data: Point[];
  height?: number;
  every?: number;
  highlightLast?: boolean;
  tone?: "accent" | "ink";
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const fill = tone === "accent" ? "bg-accent" : "bg-ink";
  const dim = tone === "accent" ? "bg-accent/35" : "bg-ink/25";
  const n = data.length;

  return (
    <div>
      <div className="relative" style={{ height }}>
        {/* Recessive gridlines at 0 / 50 / 100% */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className={`absolute inset-x-0 border-t ${f === 0 ? "border-line" : "border-dashed border-line/70"}`} style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-[3px] sm:gap-1.5">
          {data.map((d, i) => {
            const pct = max ? (d.value / max) * 100 : 0;
            const strong = !highlightLast || i === n - 1;
            const align = i < n / 6 ? "start" : i > (n * 5) / 6 ? "end" : "center";
            return (
              <div key={i} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none" aria-label={`${d.label}: ${d.display ?? d.value}`}>
                <div className="absolute inset-x-0 inset-y-0 rounded-md transition group-hover:bg-mist/80" />
                <div
                  className={`relative w-full rounded-t-[4px] transition ${d.value ? (strong ? fill : dim) : ""} group-hover:opacity-90`}
                  style={{ height: d.value ? `max(${pct}%, 3px)` : 0 }}
                />
                <Tooltip align={align}>
                  <span className="text-white/70">{d.label}</span> · <span className="font-semibold">{d.display ?? d.value}</span>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-[3px] sm:gap-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[11px] text-muted">
            {(n - 1 - i) % every === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ranked horizontal bars with the value on the right. */
export function BarList({ data, tone = "ink", empty }: { data: Point[]; tone?: "accent" | "ink"; empty?: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (!data.length || !max) return <p className="py-6 text-center text-sm text-muted">{empty ?? "Nothing to show yet."}</p>;
  const fill = tone === "accent" ? "bg-accent" : "bg-ink";
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-soft">{d.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-ink">{d.display ?? d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-mist">
            <div className={`h-full rounded-full ${fill}`} style={{ width: d.value ? `max(${(d.value / max) * 100}%, 6px)` : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One 100% bar split into segments, with a labelled legend underneath. */
export function StackedBar({ data }: { data: (Point & { color: string })[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-mist">
        {total > 0 &&
          data
            .filter((d) => d.value)
            .map((d) => (
              <div key={d.label} title={`${d.label}: ${d.value}`} className={`h-full first:rounded-l-full last:rounded-r-full ${d.color}`} style={{ width: `${(d.value / total) * 100}%` }} />
            ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className={`size-2.5 shrink-0 rounded-[3px] ${d.color}`} />
            <span className="truncate text-ink-soft">{d.label}</span>
            <span className="ml-auto font-medium tabular-nums text-ink">{d.display ?? d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Progress ring for a single proportion, with the percentage in the middle. */
export function Ring({ value, size = 88, label }: { value: number; size?: number; label?: string }) {
  const v = Math.min(Math.max(value, 0), 1);
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="size-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-mist" />
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round" className="stroke-good" strokeDasharray={`${v * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-semibold tabular-nums text-ink">{Math.round(v * 100)}%</span>
        {label && <span className="text-[10px] text-muted">{label}</span>}
      </div>
    </div>
  );
}

/** Tiny trend line for a KPI tile. */
export function Sparkline({ values, className = "text-accent" }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 100;
  const h = 32;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - (v / max) * (h - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`h-8 w-full ${className}`} aria-hidden>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="currentColor" opacity="0.1" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** "+12% vs last month" chip. Returns nothing when there's no baseline to compare against. */
export function Delta({ current, previous, suffix }: { current: number; previous: number; suffix: string }) {
  if (!previous) return <span className="text-xs text-muted">Nothing {suffix.replace(/^vs /, "")} to compare</span>;
  const change = (current - previous) / previous;
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${up ? "bg-good/10 text-good" : "bg-red-50 text-red-600"}`}>
        <Icon className="size-3" strokeWidth={2.25} />
        {Math.abs(Math.round(change * 100))}%
      </span>
      {suffix}
    </span>
  );
}

/** KPI tile: label, headline number, a comparison line and an optional chart underneath. */
export function KpiTile({
  label,
  value,
  icon,
  footer,
  chart,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  footer?: React.ReactNode;
  chart?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
        <span className="flex size-6 items-center justify-center rounded-md bg-mist text-ink-soft [&_svg]:size-3.5">{icon}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-ink">{value}</p>
      {footer && <div className="mt-1.5">{footer}</div>}
      {chart && <div className="mt-auto pt-3">{chart}</div>}
    </div>
  );
}
