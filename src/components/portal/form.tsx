"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/app/actions/auth";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** A form bound to a server action that shows its error/success message and can reset itself on success. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`rounded-xl px-3.5 py-2.5 text-sm ${state.error ? "bg-red-50 text-red-700" : "bg-good/10 text-good"}`}
    >
      {state.error ?? state.ok}
    </p>
  );
}

export function SubmitButton({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "accent" | "ghost" | "danger" }) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-ink text-white hover:bg-ink-soft",
    accent: "bg-accent text-white hover:bg-accent-dark",
    ghost: "border border-line bg-white text-ink hover:border-ink/30 hover:bg-mist",
    danger: "text-red-600 hover:bg-red-50",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${styles}`}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Confirm before submitting a destructive form (e.g. delete). With `icon`, renders as a round outlined icon button. */
export function ConfirmButton({ children, message, icon, className }: { children: React.ReactNode; message: string; icon?: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={icon ? String(children) : undefined}
      title={icon ? String(children) : undefined}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className={
        className ??
        (icon
          ? "flex size-8 items-center justify-center rounded-full border border-line text-ink-soft transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          : "rounded-full px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60")
      }
    >
      {icon ?? children}
    </button>
  );
}

/** Round outlined icon button for small form actions (pin, hide…). */
export function IconSubmit({ label, children, active }: { label: string; children: React.ReactNode; active?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className={`flex size-8 items-center justify-center rounded-full border transition disabled:opacity-60 ${
        active ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink/25 hover:bg-mist hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
