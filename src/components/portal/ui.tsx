import { Info } from "lucide-react";
import { courses } from "@/lib/site";

export function Card({ title, action, children, className = "", id }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-2xl border border-line bg-white p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
        {text && <p className="mt-0.5 text-[12.5px] text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

/** Segmented bar meter, e.g. ▮▮▮▯▯ for 60%. */
export function Meter({ value, segments = 5, tone = "good" }: { value: number; segments?: number; tone?: "good" | "ink" | "warn" }) {
  const filled = Math.round(Math.min(Math.max(value, 0), 1) * segments);
  const color = { good: "bg-good", ink: "bg-ink", warn: "bg-red-500" }[tone];
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={`h-3.5 w-[4px] rounded-[1.5px] ${i < filled ? color : "bg-line"}`} />
      ))}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  meter,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn";
  meter?: number;
}) {
  const color = { default: "text-ink", good: "text-good", warn: "text-red-600" }[tone];
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className={`mt-1 text-lg font-semibold tracking-tight tabular-nums ${color}`}>{value}</p>
      {meter !== undefined && (
        <div className="mt-2">
          <Meter value={meter} tone={tone === "warn" ? "warn" : "good"} />
        </div>
      )}
      {hint && <p className="mt-1 text-[12.5px] text-muted">{hint}</p>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "brand" | "good" }) {
  const styles = {
    default: "border-line bg-mist text-ink-soft",
    brand: "border-accent/20 bg-accent/10 text-accent-dark",
    good: "border-good/20 bg-good/10 text-good",
  }[tone];
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs ${styles}`}>{children}</span>;
}

/** Light-blue info strip with an optional action on the right. */
export function Banner({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-3">
        <Info className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={1.75} />
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-ink/40 focus:ring-4 focus:ring-ink/5";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`}>
      {children}
    </select>
  );
}

export function CourseSelect({
  name = "course_slug",
  defaultValue,
  emptyLabel = "Not assigned",
  className,
}: {
  name?: string;
  defaultValue?: string | null;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue ?? ""} className={className}>
      <option value="">{emptyLabel}</option>
      {courses.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.title}
        </option>
      ))}
    </Select>
  );
}

/** Pill-shaped filter control, matching the rounded filter chips in the toolbar. */
export const pillClass =
  "h-9 rounded-full border border-line bg-white px-4 text-sm text-ink outline-none transition hover:border-ink/25 focus:border-ink/40 focus:ring-4 focus:ring-ink/5";
