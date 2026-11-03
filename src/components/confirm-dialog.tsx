"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

/**
 * The site's own "are you sure?" dialog, in place of the browser's: a dimmed, blurred scrim with a rounded card
 * that follows the theme (including the staff portal's dark mode). Escape, the scrim and Cancel all dismiss it.
 *
 * `inline` draws it over the nearest positioned parent (the contact chat panel) instead of the whole screen.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  icon,
  inline,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for something that can't be undone: red button and warning icon. */
  tone?: "default" | "danger";
  /** Replaces the warning icon; e.g. the action's own icon. */
  icon?: React.ReactNode;
  inline?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); // the dialog takes Escape; whatever is underneath (e.g. the chat) stays open
      onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onCancel]);

  if (!open) return null;

  const danger = tone === "danger";
  const dialog = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-description" : undefined}
      onClick={onCancel}
      className={`${inline ? "absolute" : "fixed"} inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs animate-pop-in rounded-3xl bg-white p-5 text-center text-ink shadow-[0_24px_60px_-20px_rgba(11,18,32,0.45)] ring-1 ring-ink/10"
      >
        <span
          className={`mx-auto flex size-11 items-center justify-center rounded-full ${danger ? "bg-red-50 text-red-600" : "bg-mist text-ink"}`}
        >
          {icon ?? <AlertTriangle className="size-5" strokeWidth={2} />}
        </span>
        <p id="confirm-dialog-title" className="mt-3 text-base font-semibold">
          {title}
        </p>
        {description && (
          <p id="confirm-dialog-description" className="mt-1 text-sm text-muted">
            {description}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            ref={cancel}
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-soft ring-1 ring-ink/10 transition hover:bg-mist"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold text-white transition ${
              danger ? "bg-[#dc2626] hover:bg-[#b91c1c]" : "bg-ink hover:bg-ink-soft"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) return dialog;
  // Mounted inside the portal shell when there is one, so its dark-mode colours apply
  return createPortal(dialog, document.querySelector(".portal") ?? document.body);
}

/** "Delete this chat? This cannot be undone." → title "Delete this chat?", description "This cannot be undone." */
export function splitMessage(message: string) {
  const at = message.indexOf("?");
  if (at < 0 || at === message.length - 1) return { title: message, description: undefined };
  return { title: message.slice(0, at + 1).trim(), description: message.slice(at + 1).trim() || undefined };
}

const verbs = ["Delete", "Remove", "End", "Clear", "Reset", "Hide", "Start"];
/** The button label for a message such as "Delete this announcement?" → "Delete". */
export function verbOf(message: string) {
  const first = message.split(/\s/)[0];
  return verbs.includes(first) ? first : "Confirm";
}
