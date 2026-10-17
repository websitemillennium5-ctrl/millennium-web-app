"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// Public, unauthenticated actions behind the jobs page "Apply now" popup. They use the service-role client,
// so they only ever answer yes/no or insert a lead; nothing about students is sent back.

/** Whether `studentId` belongs to a Millennium student (case-insensitive exact match). */
export async function verifyStudentId(studentId: string): Promise<boolean> {
  const id = studentId.trim();
  if (!id || id.length > 40) return false;
  const { count } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student")
    .ilike("student_id", id.replace(/[%_\\]/g, "\\$&"));
  return (count ?? 0) > 0;
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

  const { error } = await createAdminClient()
    .from("leads")
    .insert({
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
    });
  return error ? { error: "Something went wrong. Please try again." } : {};
}
