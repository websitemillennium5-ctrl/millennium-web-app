import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/* Server-rendered charts for the staff overview: plain HTML/SVG with CSS hover tooltips, no chart library and no
   client JS. Marks carry colour (the --viz-* tokens in globals.css); values, labels and legends stay in text tokens.
   Specs: thin marks, 4px rounded data ends, hairline solid gridlines, a 2px surface gap between touching fills. */

export type Point = { label: string; value: number; display?: string };
export type Segment = Point & { color: string };

/** Chart colour slots: identity hues validated for colour-vision deficiency, plus the de-emphasis grey and the single-series ink. */
export const viz = {
  blue: "var(--viz-1)",
  amber: "var(--viz-2)",
  green: "var(--viz-3)",
  muted: "var(--viz-muted)",
  ink: "var(--viz-ink)",
  good: "var(--color-good)",
  red: "#dc2626",
} as const;

/** The nearest clean ceiling above a maximum (1, 2, 5 × 10ⁿ), so gridlines land on round numbers. */
function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const unit = max / pow;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return step * pow;
}
const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString("en-IN"));

function Tooltip({ children, align = "center" }: { children: React.ReactNode; align?: "start" | "center" | "end" }) {
  const pos = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" }[align];
  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-canvas opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 ${pos}`}
    >
      {children}
    </span>
  );
}

/** Y-axis: three round ticks (0, half, top) in the gutter, with matching hairlines across the plot. */
function Grid({ top, tick, children, height }: { top: number; tick: (n: number) => string; children: React.ReactNode; height: number }) {
  const ticks = [0, 0.5, 1];
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2">
      <div className="relative w-7" style={{ height }}>
        {ticks.map((f) => (
          <span key={f} className="absolute right-0 translate-y-1/2 text-[10px] tabular-nums text-muted" style={{ bottom: `${f * 100}%` }}>
            {tick(top * f)}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height }}>
        {ticks.map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${f * 100}%` }} />
        ))}
        {children}
      </div>
    </div>
  );
}

/** X-axis labels under a plot that has a y gutter; `every` thins them when there are many points. */
function XAxis({ data, every }: { data: Point[]; every: number }) {
  const n = data.length;
  return (
    <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2">
      <div className="w-7" />
      <div className="flex">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10.5px] text-muted">
            {(n - 1 - i) % every === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Smooth path through points (Catmull-Rom → cubic Bézier), in a 100×100 box so HTML overlays can share the same percentages. */
function curve(points: [number, number][]) {
  if (points.length < 2) return "";
  const p = points;
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(i - 1, 0)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(i + 2, p.length - 1)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

/**
 * Single series over time: a 2px line with a 10% wash under it, the latest point labelled, and a crosshair tooltip
 * on hover (each point's hit area is the whole column above it).
 */
export function AreaChart({
  data,
  height = 170,
  every = 1,
  color = viz.blue,
  tick = compact,
}: {
  data: Point[];
  height?: number;
  every?: number;
  color?: string;
  tick?: (n: number) => string;
}) {
  const top = niceMax(Math.max(...data.map((d) => d.value), 0));
  const n = data.length;
  const pts = data.map((d, i) => [(i / Math.max(n - 1, 1)) * 100, 100 - (d.value / top) * 100] as [number, number]);
  const line = curve(pts);
  const last = data[n - 1];
  const lastY = (last.value / top) * 100;

  return (
    <div>
      <Grid top={top} tick={tick} height={height}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" style={{ color }} aria-hidden>
          <path d={`${line} L100,100 L0,100 Z`} fill="currentColor" opacity="0.1" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {/* Latest value: the one direct label */}
        <span className="pointer-events-none absolute z-[1] size-2 -translate-x-1/2 translate-y-1/2 rounded-full" style={{ left: "100%", bottom: `${lastY}%`, background: color, boxShadow: "0 0 0 2px var(--surface)" }} />
        <span className="pointer-events-none absolute right-0 z-[1] mb-2 text-[11px] font-semibold text-ink" style={{ bottom: `${lastY}%` }}>
          {last.display ?? last.value}
        </span>
        <div className="absolute inset-0 flex">
          {data.map((d, i) => {
            const align = i < n / 6 ? "start" : i > (n * 5) / 6 ? "end" : "center";
            const y = (d.value / top) * 100;
            return (
              <div key={i} tabIndex={0} className="group relative h-full flex-1 outline-none" aria-label={`${d.label}: ${d.display ?? d.value}`}>
                <span className="absolute inset-y-0 left-1/2 w-px bg-ink/30 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
                <span
                  className="absolute left-1/2 size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{ bottom: `${y}%`, background: color, boxShadow: "0 0 0 2px var(--surface)" }}
                />
                <Tooltip align={align}>
                  <span className="opacity-70">{d.label}</span> · <span className="font-semibold">{d.display ?? d.value}</span>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </Grid>
      <XAxis data={data} every={every} />
    </div>
  );
}

/** Columns over time, capped at 24px wide with rounded caps. `highlightLast` greys the earlier columns; the top column is labelled. */
export function ColumnChart({
  data,
  height = 170,
  every = 1,
  highlightLast = false,
  color = viz.ink,
  tick = compact,
}: {
  data: Point[];
  height?: number;
  every?: number;
  highlightLast?: boolean;
  color?: string;
  tick?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const top = niceMax(max);
  const n = data.length;
  const best = data.findIndex((d) => d.value === max);

  return (
    <div>
      <Grid top={top} tick={tick} height={height}>
        <div className="absolute inset-0 flex gap-[2px]">
          {data.map((d, i) => {
            const pct = (d.value / top) * 100;
            const strong = !highlightLast || i === n - 1;
            const align = i < n / 6 ? "start" : i > (n * 5) / 6 ? "end" : "center";
            return (
              <div key={i} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none" aria-label={`${d.label}: ${d.display ?? d.value}`}>
                <div className="absolute inset-0 rounded-md bg-mist opacity-0 transition group-hover:opacity-70" />
                {max > 0 && i === best && d.value > 0 && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10.5px] font-semibold whitespace-nowrap text-ink" style={{ bottom: `calc(${pct}% + 4px)` }}>
                    {d.display ?? d.value}
                  </span>
                )}
                <div
                  className="relative w-full max-w-6 rounded-t-[4px] transition group-hover:opacity-80"
                  style={{ height: d.value ? `max(${pct}%, 2px)` : 0, background: color, opacity: strong ? 1 : 0.3 }}
                />
                <Tooltip align={align}>
                  <span className="opacity-70">{d.label}</span> · <span className="font-semibold">{d.display ?? d.value}</span>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </Grid>
      <XAxis data={data} every={every} />
    </div>
  );
}

/** Ranked horizontal bars in one hue, largest first, the value at the tip. */
export function BarList({ data, color = viz.blue, empty }: { data: Point[]; color?: string; empty?: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (!data.length || !max) return <p className="py-6 text-center text-sm text-muted">{empty ?? "Nothing to show yet."}</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-soft">{d.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-ink">{d.display ?? d.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-mist">
            <div className="h-full rounded-full" style={{ width: d.value ? `max(${(d.value / max) * 100}%, 6px)` : 0, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * One whole split into parts. `tall` prints each part's share inside its block (when it fits) with a legend of names;
 * the thin form keeps the numbers in the legend rows instead. A 2px surface gap separates the parts.
 */
export function SegmentedBar({ data, tall = false }: { data: Segment[]; tall?: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const parts = data.filter((d) => d.value > 0);
  return (
    <div>
      <div className={`flex gap-[2px] overflow-hidden rounded-lg ${tall ? "h-7" : "h-2 rounded-full"} ${parts.length ? "" : "bg-mist"}`}>
        {parts.map((d) => {
          const share = d.value / total;
          return (
            <div
              key={d.label}
              tabIndex={0}
              aria-label={`${d.label}: ${d.display ?? d.value} (${Math.round(share * 100)}%)`}
              className={`group relative flex h-full items-center px-2 outline-none transition hover:opacity-90 ${tall ? "rounded-[4px]" : "rounded-full"}`}
              style={{ width: `${share * 100}%`, background: d.color }}
            >
              {tall && share >= 0.12 && <span className="text-[11px] font-semibold text-white tabular-nums">{Math.round(share * 100)}%</span>}
              <Tooltip>
                <span className="opacity-70">{d.label}</span> · <span className="font-semibold">{d.display ?? d.value}</span>
              </Tooltip>
            </div>
          );
        })}
      </div>
      <ul className={`mt-3.5 grid gap-x-4 gap-y-2 ${tall ? "grid-cols-2" : "grid-cols-2"}`}>
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
            <span className="truncate text-ink-soft">{d.label}</span>
            {!tall && <span className="ml-auto font-medium tabular-nums text-ink">{d.display ?? d.value}</span>}
            {tall && <span className="ml-auto text-xs tabular-nums text-muted">{d.display ?? d.value}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ring meter for one proportion: the fill in the good hue over a lighter track of the same hue, the figure in the middle. */
export function Ring({ value, size = 92, label, color = viz.good }: { value: number; size?: number; label?: string; color?: string }) {
  const v = Math.min(Math.max(value, 0), 1);
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, color }}>
      <svg viewBox="0 0 36 36" className="size-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" stroke="currentColor" opacity="0.15" />
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" strokeLinecap="round" stroke="currentColor" strokeDasharray={`${v * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-ink">{Math.round(v * 100)}%</span>
        {label && <span className="text-[10px] text-muted">{label}</span>}
      </div>
    </div>
  );
}

/** Tiny trend for a stat tile: the series in the de-emphasis grey with the latest point in the accent. */
export function Sparkline({ values, color = viz.blue }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 100 - 6 - (v / max) * 88] as [number, number]);
  const line = curve(pts);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <div className="relative h-9">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" style={{ color }} aria-hidden>
        <path d={`${line} L100,100 L0,100 Z`} fill="currentColor" opacity="0.1" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
      </svg>
      <span className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${lx}%`, top: `${ly}%`, background: color, boxShadow: "0 0 0 2px var(--surface)" }} />
    </div>
  );
}

/** "+12% vs last month" chip. Says so when there is no baseline to compare against. */
export function Delta({ current, previous, suffix, invert = false }: { current: number; previous: number; suffix: string; invert?: boolean }) {
  if (!previous) return <span className="text-xs text-muted">Nothing {suffix.replace(/^vs /, "")} to compare</span>;
  const change = (current - previous) / previous;
  const up = change >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${good ? "bg-good/10 text-good" : "bg-red-50 text-red-600"}`}>
        <Icon className="size-3" strokeWidth={2.25} />
        {Math.abs(Math.round(change * 100))}%
      </span>
      {suffix}
    </span>
  );
}

/** Stat tile: label, headline figure, a comparison line and an optional trend underneath. */
export function KpiTile({ label, value, icon, footer, chart }: { label: string; value: React.ReactNode; icon: React.ReactNode; footer?: React.ReactNode; chart?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:border-ink/15">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted">{label}</p>
        <span className="flex size-7 items-center justify-center rounded-lg bg-mist text-ink-soft [&_svg]:size-3.5">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {footer && <div className="mt-1.5">{footer}</div>}
      {chart && <div className="mt-auto pt-3">{chart}</div>}
    </div>
  );
}
