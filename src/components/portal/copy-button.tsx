"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Round icon button that copies `text` to the clipboard and flashes a tick. */
export function CopyButton({ text, label = "Copy details", small }: { text: string; label?: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers / non-HTTPS: fall back to a hidden textarea.
      const el = Object.assign(document.createElement("textarea"), { value: text });
      el.style.cssText = "position:fixed;opacity:0";
      document.body.append(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied!" : label}
      className={`relative flex items-center justify-center rounded-full border transition ${small ? "size-7" : "size-8"} ${
        copied ? "border-good/30 bg-good/10 text-good" : "border-line bg-white text-ink-soft hover:border-ink/25 hover:bg-mist hover:text-ink"
      }`}
    >
      {copied ? <Check className={small ? "size-3.5" : "size-4"} strokeWidth={2} /> : <Copy className={small ? "size-3.5" : "size-4"} strokeWidth={1.75} />}
      <span
        role="status"
        className={`pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-md bg-ink px-2 py-0.5 text-[11px] whitespace-nowrap text-white transition ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        Copied
      </span>
    </button>
  );
}
