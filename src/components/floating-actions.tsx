"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, MessageCircle } from "lucide-react";
import { openContactChat } from "@/components/contact-chat";

export function FloatingActions() {
  // Desktop only: on phones the jobs board puts its Filters button in this corner, and every other page
  // opens the chat from the bottom pill (PlacementsDock) instead
  return (
    <button
      type="button"
      onClick={openContactChat}
      aria-label="Chat with us"
      className="fixed right-5 bottom-5 z-[70] hidden size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-brand-dark lg:flex"
    >
      <MessageCircle className="size-6" />
    </button>
  );
}

/** Landing page only: pill pinned to the bottom centre that leads to the public jobs board. */
export function FindJobsButton() {
  return (
    <Link
      href="/airline-jobs"
      className="fixed bottom-5 left-1/2 z-[70] hidden h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-sm font-medium text-white shadow-lg shadow-black/25 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-ink-soft lg:flex"
    >
      <Briefcase className="size-4" strokeWidth={2} />
      Find jobs
      <ArrowRight className="size-4" />
    </Link>
  );
}
