"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, X } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry-form";
import { useScrollLock } from "@/lib/scroll-lock";
import { site, telHref } from "@/lib/site";

const OPEN_EVENT = "millennium:open-counselling";

/** Opens the full-screen counselling form from anywhere on the site. */
export function openCounselling() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** A "Book free counselling" button: looks like whatever className says, opens the form instantly. */
export function CounsellingButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={openCounselling} className={className}>
      {children}
    </button>
  );
}

/** Full-screen enquiry form, mounted once in the site layout and opened by openCounselling(). */
export function CounsellingModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialog}
      data-lenis-prevent
      onClose={() => setOpen(false)}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none animate-pop-in bg-white p-0 text-left text-ink"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
          <h2 className="truncate text-lg font-semibold tracking-tight">Free counselling</h2>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={telHref(site.phones[0])}
              aria-label={`Call ${site.phones[0]}`}
              title={site.phones[0]}
              className="flex size-10 items-center justify-center rounded-full bg-mist text-ink transition hover:bg-ink hover:text-white"
            >
              <Phone className="size-4" />
            </a>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="flex size-10 items-center justify-center rounded-full bg-mist text-ink transition hover:bg-ink hover:text-white"
            >
              <X className="size-4.5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-xl px-5 py-6 sm:px-8 sm:py-10">
            <EnquiryForm />
          </div>
        </div>
      </div>
    </dialog>
  );
}
