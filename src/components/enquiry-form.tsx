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
      <div role="status" aria-live="polite" className="py-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-good/10 text-good">
          <CheckCircle2 className="size-6" />
        </span>
        <h3 className="mt-4 text-xl font-semibold tracking-tight">Thanks, {done.name}!</h3>
        <p className="mt-1 text-sm text-muted">A counsellor will call you soon.</p>
        <a
          href={done.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <WhatsAppIcon className="size-4" /> WhatsApp us
        </a>
        <div className="mt-4">
          <button type="button" onClick={() => setDone(null)} className="text-sm text-muted underline underline-offset-4 transition hover:text-ink">
            Send another
          </button>
        </div>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-ink focus:ring-4 focus:ring-ink/5";

  return (
    // Placeholders do the labelling: four fields, nothing else to read
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <input name="name" required autoComplete="name" placeholder="Name" aria-label="Name" className={field} />
      <input name="phone" type="tel" required autoComplete="tel" pattern="[0-9+\s\-]{10,15}" placeholder="Phone" aria-label="Phone" className={field} />
      <select name="course" defaultValue={defaultCourse} aria-label="Course" className={`${field} sm:col-span-2`}>
        <option value="">Course (not sure yet)</option>
        {courses.map((c) => (
          <option key={c.slug} value={c.title}>
            {c.title}
          </option>
        ))}
      </select>
      <textarea name="message" rows={2} placeholder="Message (optional)" aria-label="Message" className={`${field} sm:col-span-2`} />
      {error && (
        <p className="text-xs text-brand sm:col-span-2" aria-live="polite">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60 sm:col-span-2"
      >
        {sending ? "Sending…" : "Send"} <Send className="size-4" />
      </button>
    </form>
  );
}
