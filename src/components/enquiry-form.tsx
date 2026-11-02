"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { sendEnquiry } from "@/app/actions/enquiry";
import { WhatsAppIcon } from "@/components/icons";
import { courses, whatsappHref } from "@/lib/site";

/**
 * Public enquiry form (contact page, course pages and the counselling popup). Saves the enquiry as a lead and
 * emails it to the academy, then shows a confirmation with the option to continue the conversation on WhatsApp
 * (a pre-filled message); nothing opens unless the person chooses to.
 */
export function EnquiryForm({ defaultCourse = "" }: { defaultCourse?: string }) {
  const [sending, startSending] = useTransition();
  const [done, setDone] = useState<{ name: string; whatsapp: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const message = [
      "Hello Millennium Air Hostess Academy, I'd like to enquire about admission.",
      `Name: ${value("name")}`,
      `Phone: ${value("phone")}`,
      value("email") ? `Email: ${value("email")}` : null,
      `Course: ${value("course") || "Not sure yet"}`,
      value("message") ? `Message: ${value("message")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    setError(null);
    startSending(async () => {
      const id = await sendEnquiry({
        name: value("name"),
        phone: value("phone"),
        email: value("email"),
        course: value("course"),
        message: value("message"),
        page: window.location.pathname,
      }).catch(() => null);
      if (!id) {
        setError("Something went wrong and your enquiry was not sent. Please try again, or message us on WhatsApp.");
        return;
      }
      form.reset();
      setDone({ name: value("name").split(" ")[0] || "there", whatsapp: whatsappHref(message) });
    });
  }

  if (done) {
    return (
      <div role="status" aria-live="polite" className="rounded-2xl border border-line bg-mist/60 p-6 text-center sm:p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-good/10 text-good">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-4 text-xl font-semibold tracking-tight">Thanks, {done.name}! We&apos;ve received your enquiry.</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          A counsellor will call you within a few hours. Want a faster reply? Continue the conversation on WhatsApp and
          your details will already be filled in.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={done.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/25 transition hover:brightness-95"
          >
            <WhatsAppIcon className="size-4" /> Continue on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="inline-flex items-center justify-center rounded-full px-5 py-3.5 text-sm font-semibold text-muted transition hover:text-ink"
          >
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-ink focus:ring-4 focus:ring-ink/5";

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">
        Full name *
        <input name="name" required autoComplete="name" placeholder="Your name" className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Phone *
        <input
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          pattern="[0-9+\s\-]{10,15}"
          placeholder="+91 98765 43210"
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="email" placeholder="you@example.com" className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Course of interest
        <select name="course" defaultValue={defaultCourse} className={field}>
          <option value="">Not sure yet</option>
          {courses.map((c) => (
            <option key={c.slug} value={c.title}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
        Message
        <textarea name="message" rows={4} placeholder="Tell us a little about yourself or ask a question" className={field} />
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-xs ${error ? "text-brand" : "text-muted"}`} aria-live="polite">
          {error ?? "We usually reply within a few hours."}
        </p>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send enquiry"} <Send className="size-4" />
        </button>
      </div>
    </form>
  );
}
