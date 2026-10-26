"use server";

import { after } from "next/server";
import { sendFormEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export type EnquiryInput = { name: string; phone: string; email: string; course: string; message: string; page: string };

const clean = (value: string, max = 200) => value.trim().slice(0, max) || null;

/** Public enquiry form (contact and course pages): saves it as a lead and emails it to the academy inbox. */
export async function sendEnquiry(input: EnquiryInput): Promise<void> {
  const name = clean(input.name, 120);
  const phone = clean(input.phone, 20);
  if (!name || !phone) return;
  const email = clean(input.email, 160);
  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  const page = clean(input.page);
  const lead = {
    name,
    phone,
    email,
    course: clean(input.course),
    message: clean(input.message, 2000),
    source: page?.startsWith("/courses") ? "course page" : "contact page",
    listing_url: page,
  };

  const { error } = await createAdminClient().from("leads").insert(lead);
  if (error) console.error("Saving enquiry failed:", error.message);

  after(() =>
    sendFormEmail({
      kind: "enquiry",
      subject: `New enquiry: ${name}${lead.course ? ` · ${lead.course}` : ""}`,
      title: name,
      subtitle: lead.course ? `Interested in ${lead.course}` : "Not sure which course yet",
      phone,
      email,
      replyTo: validEmail,
      message: lead.message,
      fields: {
        Course: lead.course ?? "Not sure yet",
        "Sent from": page ? { text: lead.source === "course page" ? "Course page" : "Contact page", href: `https://millenniumairhostess.com${page}` } : null,
      },
    }),
  );
}
