"use server";

import { after } from "next/server";
import { sendFormEmail } from "@/lib/email";
import { experienceLabels } from "@/lib/leads";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, unauthenticated actions behind the jobs page "Apply now" popup. They use the service-role client,
// so they only ever answer yes/no or insert a lead; nothing about students is sent back.

/** Whether `studentId` belongs to a Millennium student (case-insensitive exact match). Emails the academy on a match. */
export async function verifyStudentId(studentId: string, listing?: { title: string; url: string }): Promise<boolean> {
  const id = studentId.trim();
  if (!id || id.length > 40) return false;
  const { count } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student")
    .ilike("student_id", id.replace(/[%_\\]/g, "\\$&"));
  const verified = (count ?? 0) > 0;
  if (verified)
    after(() =>
      sendFormEmail({
        kind: "student",
        subject: `Student applying: ${id}${listing ? ` · ${listing.title}` : ""}`,
        title: `Student ${id}`,
        subtitle: listing ? `Applying for ${listing.title}` : "Verified their student ID on the jobs page",
        link: listing && { label: "Open job", href: listing.url },
        fields: { "Student ID": `${id} (verified)`, "Applying for": listing?.title },
      }),
    );
  return verified;
}

const experiences = ["none", "airline", "hospitality", "other"] as const;

export type LeadInput = {
  name: string;
  phone: string;
  email: string;
  city: string;
  experience: string;
  experience_details: string;
  listing_title: string;
  listing_url: string;
  student_id_tried: string;
};

const clean = (value: string, max = 200) => value.trim().slice(0, max) || null;

export async function createLead(input: LeadInput): Promise<{ error?: string }> {
  const name = clean(input.name, 120);
  const phone = clean(input.phone, 20);
  const email = clean(input.email, 160);
  const city = clean(input.city, 80);
  if (!name || !phone || !email || !city) return { error: "Please fill in your name, phone, email and city." };
  if (phone.replace(/\D/g, "").length < 10) return { error: "Please enter a valid phone number." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  const experience = experiences.find((e) => e === input.experience);
  if (!experience) return { error: "Please tell us about your prior experience." };

  const lead = {
    name,
    phone,
    email,
    city,
    experience,
    experience_details: clean(input.experience_details, 500),
    source: "jobs page",
    listing_title: clean(input.listing_title),
    listing_url: clean(input.listing_url, 500),
    student_id_tried: clean(input.student_id_tried, 40),
  };
  const { error } = await createAdminClient().from("leads").insert(lead);
  if (error) return { error: "Something went wrong. Please try again." };

  after(() =>
    sendFormEmail({
      kind: "applicant",
      subject: `New applicant: ${name}${lead.listing_title ? ` · ${lead.listing_title}` : ""}`,
      title: name,
      subtitle: lead.listing_title ? `Applying for ${lead.listing_title}` : "Applied from the jobs page",
      phone,
      email,
      replyTo: email,
      link: lead.listing_url ? { label: "Open job", href: lead.listing_url } : null,
      message: lead.experience_details,
      fields: {
        City: city,
        Experience: experienceLabels[experience],
        "Applying for": lead.listing_title,
        "Student ID tried": lead.student_id_tried && `${lead.student_id_tried} (not found)`,
      },
    }),
  );

  return {};
}
