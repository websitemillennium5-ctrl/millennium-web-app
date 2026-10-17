"use client";

import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "@/components/icons";
import { whatsappHref } from "@/lib/site";

export function FloatingActions() {
  // On phones the jobs board puts its Filters button in this corner instead
  const jobsBoard = usePathname() === "/airline-jobs";
  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`fixed right-5 bottom-5 z-[70] ${jobsBoard ? "hidden lg:flex" : "flex"} size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105`}
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}

/** Landing page only: pill pinned to the bottom centre that leads to the public jobs board. */
export function FindJobsButton() {
  return (
    <Link
      href="/airline-jobs"
      className="fixed bottom-5 left-1/2 z-[70] flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-sm font-medium text-white shadow-lg shadow-black/25 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-ink-soft"
    >
      <Briefcase className="size-4" strokeWidth={2} />
      Find jobs
      <ArrowRight className="size-4" />
    </Link>
  );
}
