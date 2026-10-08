"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { courses, whatsappHref } from "@/lib/site";

// Sends the enquiry straight to the academy's WhatsApp, so it works without a backend.
export function EnquiryForm({ defaultCourse = "" }: { defaultCourse?: string }) {
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const message = [
      "Hello Millennium Air Hostess Academy, I'd like to enquire about admission.",
      `Name: ${data.get("name")}`,
      `Phone: ${data.get("phone")}`,
      data.get("email") ? `Email: ${data.get("email")}` : null,
      `Course: ${data.get("course") || "Not sure yet"}`,
      data.get("message") ? `Message: ${data.get("message")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(whatsappHref(message), "_blank", "noopener");
    setSent(true);
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
        <p className="text-xs text-muted" aria-live="polite">
          {sent ? "Thanks! Your message has opened in WhatsApp — just hit send." : "We usually reply within a few hours."}
        </p>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
        >
          Send enquiry <Send className="size-4" />
        </button>
      </div>
    </form>
  );
}
