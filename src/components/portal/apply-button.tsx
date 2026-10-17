"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowUpRight, CheckCircle2, ChevronRight, GraduationCap, Loader2, UserRound, X } from "lucide-react";
import { createLead, verifyStudentId } from "@/app/actions/leads";
import { Field, Input, Select, Textarea } from "@/components/portal/ui";

/** Set once a visitor has verified or shared their details, so later "Apply now" clicks open the link directly. */
const STORAGE_KEY = "millennium:apply-unlocked";

const isUnlocked = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};
const unlock = () => {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {}
};

type Step = "ask" | "student" | "details" | "done";

const primary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-dark disabled:opacity-60";
const secondary =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25";

/**
 * Public "Apply now": before handing over the airline's link, asks whether the visitor is a Millennium student.
 * Students confirm with their student ID; everyone else (or an unknown ID) shares their details, saved as a lead.
 */
export function ApplyButton({ url, listing }: { url: string; listing: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("ask");
  const [studentId, setStudentId] = useState("");
  const [idMissed, setIdMissed] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const open = () => {
    if (isUnlocked()) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setStep("ask");
    setStudentId("");
    setIdMissed(false);
    setError("");
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const finish = () => {
    unlock();
    setStep("done");
  };

  const checkId = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      if (await verifyStudentId(studentId)) finish();
      else {
        // Unknown ID: straight to the details form, which explains why
        setIdMissed(true);
        setStep("details");
      }
    });
  };

  const submitDetails = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const field = (key: string) => String(fd.get(key) ?? "");
    setError("");
    startTransition(async () => {
      const result = await createLead({
        name: field("name"),
        phone: field("phone"),
        email: field("email"),
        city: field("city"),
        experience: field("experience"),
        experience_details: field("experience_details"),
        listing_title: listing,
        listing_url: url,
        student_id_tried: idMissed ? studentId : "",
      });
      if (result.error) setError(result.error);
      else finish();
    });
  };

  return (
    <>
      <button type="button" onClick={open} className={primary}>
        Apply now <ArrowUpRight className="size-3.5" />
      </button>

      <dialog
        ref={dialog}
        data-lenis-prevent
        onClick={(e) => e.target === dialog.current && close()}
        className="portal m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-line bg-white p-0 text-left text-ink shadow-[0_24px_64px_-24px_rgba(24,24,27,0.35)] backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]"
      >
        <div className="relative max-h-[85vh] overflow-y-auto p-6 sm:p-7">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full p-1.5 text-muted transition hover:bg-mist hover:text-ink"
          >
            <X className="size-4" />
          </button>
          <p className="pr-8 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Applying for</p>
          <p className="mt-1 pr-8 text-sm leading-snug text-ink-soft">{listing}</p>
          <div className="my-5 h-px bg-line" />

          {step === "ask" && (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Are you a Millennium student?</h2>
              <p className="mt-1 text-sm text-muted">Students get straight through with their student ID.</p>
              <div className="mt-5 space-y-2.5">
                {[
                  { next: "student" as const, icon: GraduationCap, title: "Yes, I'm a student", text: "Verify with your student ID" },
                  { next: "details" as const, icon: UserRound, title: "No, I'm not", text: "Share a few details to continue" },
                ].map(({ next, icon: Icon, title, text }) => (
                  <button
                    key={next}
                    type="button"
                    onClick={() => (setIdMissed(false), setStep(next))}
                    className="group flex w-full items-center gap-3.5 rounded-2xl border border-line p-3.5 text-left transition hover:border-ink/20 hover:bg-mist/60"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist text-ink transition group-hover:bg-white">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{title}</span>
                      <span className="block text-[13px] text-muted">{text}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "student" && (
            <form onSubmit={checkId} className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Enter your student ID</h2>
              <Field label="Student ID">
                <Input
                  value={studentId}
                  onChange={(e) => (setStudentId(e.target.value), setIdMissed(false))}
                  required
                  autoFocus
                  placeholder="STU-0142"
                />
              </Field>
              <div className="flex justify-between gap-2">
                <button type="button" onClick={() => setStep("ask")} className={secondary}>
                  Back
                </button>
                <button disabled={pending} className={primary}>
                  {pending && <Loader2 className="size-3.5 animate-spin" />} Verify
                </button>
              </div>
            </form>
          )}

          {step === "details" && (
            <form onSubmit={submitDetails} className="space-y-3.5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">A few details before you apply</h2>
                <p className="mt-1 text-sm text-muted">Our placement team may reach out with tips for this role.</p>
              </div>
              {idMissed && (
                <div role="alert" className="flex gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    The student ID you entered (<span className="font-medium">{studentId}</span>) is wrong. Fill in your details below to continue, or{" "}
                    <button type="button" onClick={() => setStep("student")} className="font-medium underline underline-offset-2">
                      try another ID
                    </button>
                    .
                  </p>
                </div>
              )}
              <Field label="Full name *">
                <Input name="name" required autoComplete="name" />
              </Field>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Phone *">
                  <Input name="phone" type="tel" required autoComplete="tel" placeholder="+91" />
                </Field>
                <Field label="City *">
                  <Input name="city" required autoComplete="address-level2" />
                </Field>
              </div>
              <Field label="Email *">
                <Input name="email" type="email" required autoComplete="email" />
              </Field>
              <Field label="Prior experience *">
                <Select name="experience" required defaultValue="">
                  <option value="" disabled>
                    Select one
                  </option>
                  <option value="none">No prior experience</option>
                  <option value="airline">Airline / aviation</option>
                  <option value="hospitality">Hospitality</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Tell us more (optional)">
                <Textarea name="experience_details" rows={2} placeholder="e.g. 1 year as ground staff at Delhi airport" />
              </Field>
              {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
              <div className="flex justify-between gap-2 pt-1">
                <button type="button" onClick={() => setStep("ask")} className={secondary}>
                  Back
                </button>
                <button disabled={pending} className={primary}>
                  {pending && <Loader2 className="size-3.5 animate-spin" />} Continue
                </button>
              </div>
            </form>
          )}

          {step === "done" && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto size-10 text-good" />
              <h2 className="mt-3 text-lg font-semibold tracking-tight">You&apos;re all set</h2>
              <p className="mt-1 text-sm text-muted">The application opens on the airline&apos;s website. Best of luck!</p>
              <a href={url} target="_blank" rel="noreferrer" onClick={close} className={`${primary} mt-5 w-full`}>
                Continue to application <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
