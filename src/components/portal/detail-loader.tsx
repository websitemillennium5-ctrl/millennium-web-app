/** Shown by the detail routes' loading.tsx while the job / event loads: five meter bars lighting up in a wave. */
export function DetailLoader({ label = "Loading details" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
      <span className="flex items-end gap-[5px]" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="animate-meter-wave h-7 w-[7px] origin-bottom rounded-[2px] bg-good"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </span>
      <p className="text-sm font-medium text-ink-soft">
        {label}
        <span className="inline-block w-4 text-left after:animate-pulse after:content-['…']" />
      </p>
    </div>
  );
}
